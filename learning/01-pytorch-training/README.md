# 01 · PyTorch Training Loop

这个练习不依赖现成数据集，而是生成一个可以画在平面上的 XOR 二分类问题。目标不是
获得一个有实际用途的分类器，而是独立走通一次可观察、可测试、可恢复的 PyTorch
训练流程。

## 先运行一次

从仓库根目录执行：

```bash
uv run python learning/01-pytorch-training/train.py
```

脚本默认自动选择设备：CUDA 可用时使用第 1 张 GPU，否则使用 CPU。也可以明确指定：

```bash
uv run python learning/01-pytorch-training/train.py --device cpu
uv run python learning/01-pytorch-training/train.py --device cuda
```

每个 epoch 会输出：

```text
epoch=1 train_loss=... train_accuracy=... validation_loss=... validation_accuracy=...
```

训练产物位于 `learning/01-pytorch-training/runs/`：

- `checkpoint.pt`：模型、optimizer、已完成 epoch 和最近的 validation loss；
- `decision-boundary.png`：模型在整个二维平面上的分类结果。

`runs/` 已被 Git 忽略，不应提交。

## 为什么使用 XOR

每个样本只有两个特征，因此输入是平面上的一个点：

```text
x = [x₁, x₂]
```

数据集中有四团点：

```text
             x₂
              ↑
    class 1   |   class 0
--------------+--------------→ x₁
    class 0   |   class 1
```

同一类别分布在对角位置，单个线性分界线不能把它们分开。模型因此需要隐藏层和 ReLU
产生非线性决策边界：

```text
[batch, 2]
    ↓ Linear(2, 16)
[batch, 16]
    ↓ ReLU
[batch, 16]
    ↓ Linear(16, 2)
[batch, 2] logits
```

最后两个输出不是概率，而是两个类别的 logits。`CrossEntropyLoss` 会在内部完成
`log_softmax` 和负对数似然计算，因此模型的最后一层不需要手动添加 `Softmax`。

## 建议的代码阅读顺序

打开 `train.py`，按下面的顺序阅读：

1. `generate_xor_data()`：固定 seed 后生成特征和标签；
2. `XorMLP`：在 `__init__()` 中注册层，在 `forward()` 中定义计算；
3. `train_one_epoch()`：清空梯度、前向计算、计算 loss、反向传播和更新参数；
4. `evaluate()`：切换到 eval 模式，并在 `no_grad()` 中计算验证指标；
5. `save_checkpoint()` 与 `load_checkpoint()`：保存和恢复训练状态；
6. `plot_decision_boundary()`：把稠密网格送入模型，画出每个位置的预测类别；
7. `main()`：把数据、DataLoader、模型、loss、optimizer 和 epoch 循环连接起来。

## 恢复训练

第一次只训练 10 个 epoch：

```bash
uv run python learning/01-pytorch-training/train.py --epochs 10
```

然后从第 11 个 epoch 继续，训练到总计 30 个 epoch：

```bash
uv run python learning/01-pytorch-training/train.py \
  --epochs 30 \
  --resume learning/01-pytorch-training/runs/checkpoint.pt
```

这里的 `--epochs 30` 表示目标总 epoch 数，不是再增加 30 个 epoch。

当前 checkpoint 保存：

- `model_state_dict`；
- `optimizer_state_dict`；
- 已完成的 epoch；
- 最近一次 validation loss。

它足以继续训练，但尚未保存 Python、PyTorch、CUDA 和 DataLoader generator 的完整
随机状态。因此，恢复后的训练不保证和一场从未中断的训练逐位相同。这个练习先验证
训练状态能够正确接续，后续再实现严格复现整个训练轨迹。

## 测试

测试与练习放在同一目录：

```bash
TMPDIR=/tmp TEMP=/tmp TMP=/tmp \
  uv run pytest learning/01-pytorch-training/test_train.py -q
```

这些测试分别验证：

1. 相同 seed 生成相同 XOR 数据；
2. `forward()` 保留 batch 维并输出两个 logits；
3. 模型能够过拟合一个固定小 batch；
4. checkpoint 恢复模型、optimizer 和 epoch 后，下一次参数更新仍然一致；
5. CLI 能产生 checkpoint、决策边界，并从已有 epoch 继续。

单 batch 过拟合测试只说明训练链路已经接通，不说明模型能够在未知数据上泛化。

## 观察与回答

运行和阅读代码后，尝试回答：

1. 为什么 XOR 不能只使用 `Linear(2, 2)`？
2. 为什么最后一层有两个输出，而不是一个输出？
3. `optimizer.zero_grad()` 如果被删除，梯度会发生什么？
4. 为什么 `evaluate()` 不调用 `optimizer.step()`？
5. 为什么统计 epoch loss 时要乘以当前 batch size 后再求平均？
6. checkpoint 为什么必须保存 optimizer 状态？
7. `model.eval()` 和 `torch.no_grad()` 分别改变了什么？
8. 决策边界图上的颜色区域和散点分别代表什么？

完成后再进入音乐音频数据：读取 GTZAN 样本，观察 waveform、sample rate、标签和
Mel Spectrogram；那一步暂时只做数据理解和可视化，不立即训练大型模型。
