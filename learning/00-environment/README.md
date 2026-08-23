# 00 · Environment Check

这个练习建立第 1 周的 Python、PyTorch 与 CUDA 基线。程序会：

- 输出 Python、NumPy、PyTorch、CUDA、cuDNN 和 GPU 信息；
- 为 Python、NumPy、PyTorch CPU 与所有 CUDA 设备设置同一个随机种子；
- 分别在 CPU 和第 1 张 CUDA GPU 上执行相同的矩阵运算；
- 输出一组可由测试重复验证的随机值。

## 运行

从仓库根目录执行：

```bash
uv run python learning/00-environment/environment_check.py
```

也可以指定另一颗随机种子：

```bash
uv run python learning/00-environment/environment_check.py --seed 57
```

运行对应测试：

```bash
TMPDIR=/tmp TEMP=/tmp TMP=/tmp \
  uv run pytest learning/00-environment/test_environment_check.py -q
```

这里显式使用 WSL 的 `/tmp`，避免从 Windows 启动 WSL 时继承的 `TEMP` 和 `TMP`
指向 drvfs，从而影响 pytest 对已解除链接临时文件的操作。这个命令只修改当前进程，
不会改变 Windows 或 WSL 的全局环境变量。

## 观察重点

1. `environment.pytorch` 的 `+cu128` 表示当前安装来自 CUDA 12.8 wheel；
2. `cuda.available` 必须为 `true`，且 `gpu.name` 应显示实际显卡；
3. `devices.cpu.calculation` 与 `devices.cuda.calculation` 应相同；
4. 用相同 `--seed` 连续运行两次，`random_samples` 应相同。

固定随机种子和确定性算法只能控制已知的软件随机来源；版本、硬件、并行调度和某些
非确定性算子仍可能影响结果。后续实验需要同时保存环境、配置、数据版本和指标。

## 资料

- [PyTorch Quickstart](https://docs.pytorch.org/tutorials/beginner/basics/quickstart_tutorial.html)
- [PyTorch Reproducibility](https://docs.pytorch.org/docs/stable/notes/randomness.html)
- [Using uv with PyTorch](https://docs.astral.sh/uv/guides/integration/pytorch/)
