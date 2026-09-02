# 02 · MIDI 解析与演奏比较

这个练习使用 Yamaha CLP-835 导出的五份自录 MIDI，把二进制事件转换为可以解释、
测试和比较的统计结果。重点不是识别曲名，而是理解一个琴键动作如何从 MIDI 字节变成
Python 对象，再变成音域、力度、踏板和时间指标。

围绕 PPQ、tempo、实际演奏速度、高精度触键数据和通用 MIDI 协议的完整问答见
[`docs/weekly/2026-W36.md`](../../docs/weekly/2026-W36.md)。

## 目录

```text
learning/02-midi-analysis/
├── analyze_midi.py
├── test_analyze_midi.py
├── analysis.md
├── figures/
│   ├── piano-rolls.png
│   └── velocity-distributions.png
└── data/
    ├── manifest.json
    └── samples/
        ├── note-pedal-test.mid
        ├── beyer-059-broken.mid
        ├── beyer-059-clean.mid
        ├── beyer-061.mid
        └── doll-and-bear-dance.mid
```

五个 `.mid` 文件总计只有 14,798 bytes，是自行录制、可以公开且用于复现实验的小样本，
因此直接进入 Git。大型音频、受限数据集和可重新生成的缓存仍然放在被 Git 忽略的
`data/raw/`、`data/processed/` 或 `runs/` 中。

## MIDI 文件里保存了什么

`.mid` 是 Standard MIDI File（SMF）二进制文件，不保存声音波形，而是保存事件：

```text
MThd
└── format、track 数量、ticks per quarter note

MTrk
├── delta time
├── Note On / Note Off
├── Control Change（例如 CC64 延音踏板）
├── Tempo、拍号等 meta event
└── End of Track
```

例如下面四个字节：

```text
00 90 3C 40
```

可以解码为：等待 0 tick，在 channel 0 按下 MIDI pitch 60（C4），力度为 64。
这里的 channel 0 是 Python 和 MIDI 字节中的零基编号，在许多乐器界面中会显示为
“MIDI Channel 1”。

### tick 如何变成秒

MIDI 轨道中的 `time` 通常是相对上一事件的 delta tick。脚本按照事件顺序累计时间，
并在遇到 `set_tempo` 后更新换算比例：

```text
seconds = ticks × tempo_microseconds_per_quarter
          / ticks_per_quarter / 1,000,000
```

`mido` 将文件属性命名为 `ticks_per_beat`，但 Standard MIDI File 的 PPQ 模式实际以
四分音符为固定基准。这个值由文件头定义，整个文件及所有轨道共用，不能在歌曲中途
改变；不同文件可以选择不同 PPQ。当前样本都是每四分音符 1920 tick。

如果文件尚未给出 tempo，常用默认值是每四分音符 500,000 微秒，也就是四分音符
120 BPM。这也是为什么不能把 tick 直接当作毫秒：一个 tick 的秒数同时取决于 PPQ
和当前位置生效的 tempo。

### Note On、Note Off 与按键时长

一次音符通常由一对事件组成：

```text
Note On(channel=0, note=60, velocity=80)
Note Off(channel=0, note=60)
```

脚本用 `(channel, pitch)` 配对两个事件，并用结束秒数减开始秒数得到按键时长。
实际 MIDI 还常用 `Note On + velocity 0` 表示 Note Off，分析程序也必须把它当作结束，
不能错误地计为一个新音符。

MIDI pitch 只表示半音编号，不包含乐谱拼写。因此脚本为了显示统一使用升号名称，
例如 pitch 61 显示为 C#4；仅凭 MIDI 不能判断乐谱原本写的是 C#4 还是 Db4。

### velocity、CC19、CC64 与 CC88

普通 Note On 的 `velocity` 范围是 1～127，更接近下键速度，不是手指压力或响度分贝。
CLP-835 还会在每个 Note On 前写入两项扩展数据：

```text
CC19：Yamaha 定义的 Key Acceleration
CC88：High-Resolution Velocity Prefix
```

CC88 是紧随其后的 Note On velocity 的低 7 位，可以组合为：

```text
velocity_14bit = note_on_velocity × 128 + CC88
```

因此当前脚本中的 `velocity_mean/std` 只统计兼容所有 MIDI 1.0 音源的普通 7-bit
Note On velocity，尚未把 CC88 合成到指标中，也没有把 CC19 当作等价力度。

`CC64` 表示延音踏板。传统二值解释将 `value >= 64` 视为踩下、`value < 64` 视为
抬起；CLP-835 实际会记录 0～127 之间的连续半踏板过程。当前 down/up 指标只是粗略
阈值计数，不等于完整踏板轨迹。乐器也可能只在文件开头或结尾写一个“踏板抬起”用于
重置状态，因此单个 CC64 up 事件不能证明演奏者实际踩过踏板。

## `mido` 与 `pretty_midi` 分别做什么

脚本故意同时使用两个层次：

```text
.mid 二进制文件
      ↓ mido
Message / MetaMessage：delta tick、Note On、Note Off、CC19/64/88、tempo
      ↓ 本练习的累计与配对逻辑
MidiAnalysis：音符数、音域、力度、时长、起音间隔

.mid 二进制文件
      ↓ pretty_midi
PrettyMIDI → Instrument → Note(start, end, pitch, velocity)
      ↓
钢琴卷帘图与力度分布图
```

`mido` 适合观察原始协议事件和控制器；`pretty_midi` 把时间转换为秒，并把配对后的
音符组织到乐器对象里，更适合分析和画图。建议按下面的顺序阅读第三方源码：

1. [`pretty_midi/pretty_midi.py`](https://github.com/craffel/pretty-midi/blob/main/pretty_midi/pretty_midi.py)：文件、tempo 和时间换算；
2. [`pretty_midi/instrument.py`](https://github.com/craffel/pretty-midi/blob/main/pretty_midi/instrument.py)：乐器与音符集合；
3. [`pretty_midi/containers.py`](https://github.com/craffel/pretty-midi/blob/main/pretty_midi/containers.py)：`Note`、`ControlChange` 等对象的数据结构。

阅读时重点回答：原始事件的 delta time 在哪里变成绝对秒数？Note On 与 Note Off
在哪里配对？MIDI channel、program 和 `Instrument` 是什么关系？

## 运行分析

从仓库根目录分析 manifest 中的全部样本：

```bash
uv run python learning/02-midi-analysis/analyze_midi.py \
  --manifest learning/02-midi-analysis/data/manifest.json
```

分析任意一个使用 PPQ 时间基准的 MIDI 文件；当前练习不处理 SMPTE 时间基准：

```bash
uv run python learning/02-midi-analysis/analyze_midi.py path/to/example.mid
```

输出可供其他程序读取的 JSON：

```bash
uv run python learning/02-midi-analysis/analyze_midi.py \
  --manifest learning/02-midi-analysis/data/manifest.json \
  --json
```

重新生成图表：

```bash
uv run python learning/02-midi-analysis/analyze_midi.py \
  --manifest learning/02-midi-analysis/data/manifest.json \
  --figures-dir learning/02-midi-analysis/figures
```

## 指标怎样定义

- `note_count`：所有 velocity 大于 0 的 Note On 数量；重复弹、重来和错触也会计入。
- `playing_span_seconds`：第一个 Note On 到最后一个已配对 Note Off 的时间。
- `mean_key_hold_seconds`：已成功配对音符的平均按键时长，不等于踏板后的声学延音。
- `velocity_mean/std`：所有普通 7-bit Note On velocity 的总体均值与总体标准差，
  尚未合并 CC88，也不包含 CC19。
- `longest_onset_gap_seconds`：相邻两个 Note On 起点之间的最大间隔。
- `long_onset_gaps`：起音间隔严格大于 1.0 秒的位置，作为疑似停顿线索。
- `unmatched_note_on_count`：文件结束时仍没有对应 Note Off 的按键数量。

“起音间隔”不是严格的静音长度：前一个音可能仍按着，也可能被踏板延长。它适合寻找
异常停顿候选，再结合钢琴卷帘、听感和乐谱核对，不能单独判定演奏错误。

## 测试

```bash
TMPDIR=/tmp TEMP=/tmp TMP=/tmp \
  uv run pytest learning/02-midi-analysis/test_analyze_midi.py -q
```

测试使用临时生成的小型 MIDI，而不是依赖这五份个人样本，分别验证：

1. Note On velocity 0 被正确当作 Note Off；
2. 音高、力度、channel 和按键时长计算正确；
3. tempo 变化会改变 tick 到秒的换算；
4. CC64 和超过阈值的起音间隔被正确统计；
5. manifest 中的相对路径相对于 manifest 自身解析；
6. JSON 输出可重复，单文件表格和两张图能够生成。

## 不能从这些指标直接推出什么

- 没有参考乐谱或对齐后的标准 MIDI，不能确定哪个音是错音、漏音或多音。
- 所有演奏都在同一个 MIDI channel，不能把 channel 当作左右手标签。
- 仅按音高切分左右手只是启发式方法，交叉声部时会出错。
- CLP-835 会记录下键速度、CC19 加速度等派生值，但不记录完整的连续键位、手指动作、
  手腕紧张或身体姿态，仍需要音频、视频或教师观察。
- 不同电钢琴的 velocity 曲线不同，跨设备比较前需要校准。

实际样本的统计结果与同曲比较见 [analysis.md](analysis.md)。
