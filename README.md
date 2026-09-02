# Music AI Lab

> A hands-on laboratory for music information retrieval, audio machine
> learning, symbolic music generation, and generative models.

这是一个围绕音乐 AI、音频算法与钢琴实践的公开学习实验室。仓库用于保存基础练习、
探索性 Notebook、源码阅读笔记、阶段性个人兴趣项目，以及配套的 52 周学习路线网站。

这里追求的不是收集教程，而是留下可复现的学习证据：代码能运行、实验有配置、
结论有指标、错误有分析、每周有复盘。

## 与 Song2Piano 的边界

`music-ai-lab` 和 `song2piano` 是两个独立仓库：

```text
music-ai-lab                         song2piano
学习、实验、论文复现                 独立个人兴趣项目
允许探索和失败                       保持可测试、可评测、可部署
验证方法是否值得使用       ->        重新工程化成熟方法
```

`song2piano` 不依赖本仓库。实验结论成熟后，在 `song2piano` 中按照独立个人兴趣
项目的工程标准重新实现并补齐测试，而不是直接引用学习目录。

前两周只使用本仓库；在项目的输入、输出、数据集、baseline、评测指标和第一条
端到端链路明确之前，不创建空的 `song2piano` 脚手架。

## 目录说明

```text
music-ai-lab/
├── roadmap/             AI 可直接阅读的 52 周路线数据
├── site/                路线与学习内容浏览网站
├── learning/            按知识主题组织的小型练习
├── notebooks/           探索、可视化和假设验证
├── projects/            一至三个周末完成的阶段项目
├── references/          以 Git submodule 固定的第三方源码
├── docs/
│   ├── weekly/          周计划、周复盘、乐理和钢琴练习记录
│   ├── code-reading/    第三方源码阅读笔记
│   └── superpowers/     重要仓库变更的设计与实施记录
├── tests/               跨目录工具和仓库级规则测试
├── pyproject.toml       Python 环境与工具配置
└── .python-version      Python 版本声明
```

### `roadmap/`

保存 52 周学习路线的说明和结构化 JSON。这里的数据不依赖网站，人和 AI 都可以直接
阅读与修改，是路线内容的唯一权威来源。

### `site/`

交互式学习内容网站，以 52 周路线作为唯一主入口，在每个周节点旁展示与其相关的
笔记、Python 代码和 Notebook。它是独立的 Node.js 应用，有自己的 `package.json`
和 `package-lock.json`，不与根目录 Python 环境混用。网站只读取根目录内容，不在
自身目录维护路线或学习资料副本。

首页 `/` 与 `/roadmap` 都直接展示完整路线；笔记、代码和 Notebook 没有脱离路线的
总目录，只通过周节点中的学习产物进入详情。每个详情页都会显示所属周次和返回路线
的入口。开发和构建前会从根目录生成被 Git 忽略的临时内容索引；编辑内容时始终修改
`roadmap/`、`docs/`、`learning/`、`projects/`、`tests/` 或 `notebooks/` 中的原文件，
并在 `roadmap/artifacts.json` 中声明它和路线的关系。

### `learning/`

放围绕单个知识点的短练习，例如：

- Python、NumPy 与数据处理；
- 线性代数、概率、微积分与优化；
- PyTorch Tensor、autograd、优化器和训练循环；
- 波形、STFT、Mel、CQT、MIDI 和 MusicXML；
- Attention、Transformer、Diffusion、VAE 和 GAN。

一个文件应回答一个清晰问题。需要完整数据流、评测和报告时，升级为
`projects/` 中的阶段项目。

### `notebooks/`

放探索性工作：观察数据、画图、试听、验证 API、比较参数和定位错误。Notebook
不是长期业务逻辑的归宿；同一段代码被第二次使用，或者需要测试、长时间训练、
云端执行时，应迁移到普通 Python 模块或阶段项目。

### `projects/`

放一至三个周末能够完成的端到端学习成果，例如：

- `audio-feature-explorer`；
- `midi-corpus-analyzer`；
- `tiny-midi-transformer`；
- `basic-pitch-benchmark`；
- `chord-key-baseline`。

每个项目至少包含问题定义、可复现命令、配置、评测结果、错误分析和简短报告。
独立的 Song2Piano 个人兴趣项目不放在这里。

### `references/`

放需要长期固定版本并阅读的第三方源码，只使用 Git submodule，不复制上游源码，
也不把别人的仓库当成本仓库代码提交。阅读结论写入 `docs/code-reading/`。

当需要修改上游项目时，先 fork，再让 submodule 指向自己的 fork。

### `docs/`

- `weekly/`：本周目标、实际投入、完成证据、阻塞、下周调整，以及乐理和钢琴练习；
- `code-reading/`：记录仓库 URL、commit、阅读路径、关键设计和可迁移结论；
- `superpowers/`：保存重要结构调整的设计和实施记录。

### `tests/`

放本仓库共享 Python 工具、数据约束和仓库级规则的测试。某个阶段项目私有的测试
优先放在该项目自己的目录内。

## 内容应该放在哪里

| 内容 | 位置 |
|---|---|
| 单个语法、公式或 API 练习 | `learning/` |
| 临时探索、绘图和试听 | `notebooks/` |
| 有输入、输出、评测和报告的短项目 | `projects/` |
| 第三方完整源码 | `references/` submodule |
| 第三方源码阅读结论 | `docs/code-reading/` |
| 周目标、周复盘、乐理和钢琴记录 | `docs/weekly/` |
| Song2Piano 个人兴趣项目 | 独立 `song2piano` 仓库 |
| 少量自录或可再分发测试样本 | 对应练习的 `data/samples/`，进入 Git |
| 大型或受限原始数据、完整 checkpoint、训练日志 | Hugging Face / DagsHub，不进 Git |

## 环境

Python 采用 3.11，使用 uv 管理解释器、虚拟环境和依赖。按照
[uv 官方安装文档](https://docs.astral.sh/uv/getting-started/installation/)准备好 uv 后执行：

```bash
uv python install 3.11
uv sync
```

`uv sync` 会根据 `pyproject.toml` 和仓库中的 `uv.lock` 创建 `.venv`。不要手工维护
虚拟环境，也不要把 `.venv` 提交到 Git；只有依赖声明变化时才更新 `uv.lock`。

网站独立运行：

```bash
cd site
npm ci
npm run dev
```

完整校验：

```bash
cd site
npm run validate:data
npm test
npm run typecheck
npm run lint
npm run build
```

## References 工作流

添加一个需要固定版本的参考仓库：

```bash
git submodule add <repository-url> references/<name>
git add .gitmodules references/<name>
```

初始化已有参考源码：

```bash
git submodule update --init --recursive
```

主仓库记录 submodule commit；更新版本必须是一次有意识、可审查的变更。

## 数据、模型与实验记录

本仓库只保存代码、配置、manifest、校验和、少量合法测试样本和实验报告：

```text
GitHub                       代码、配置、Notebook、文档
Hugging Face Dataset Repo   数据集的权威版本
Hugging Face Model Repo     最终模型和模型卡
DagsHub Hosted MLflow       参数、指标、图表和实验关联
本地                         可随时删除并重建的训练缓存
```

私有仓库不改变许可证。只有在数据条款允许上传到第三方私有云时，才使用
Hugging Face Private Dataset；禁止任何第三方副本的数据必须从授权来源按需获取。

## 前两周范围

### 第 1 周：环境与最小闭环

- 完成 WSL、NVIDIA、Python、uv、VS Code 和 Jupyter 基线；
- 验证 PyTorch 能识别 CUDA；
- 建立普通 `.py`、Notebook、测试和命令行运行方式；
- 能读取并可视化一个音频文件与一个 MIDI 文件；
- 写第一份 `docs/weekly/` 周复盘。

### 第 2 周：Python、NumPy 与 PyTorch 基础

- 掌握 ndarray/Tensor 的 shape、dtype、broadcast 和索引；
- 理解 autograd、loss、optimizer 和训练/验证循环；
- 在小数据上完成一次过拟合检查；
- 用测试验证数据 shape、范围和确定性；
- 记录一次完整实验：假设、配置、结果、失败原因和下一步。
