# References

这里仅存放以 Git submodule 引入的第三方源码，用于源码阅读、实验复现和固定上游
版本。

规则：

- 不复制第三方仓库进来；
- 不把第三方代码作为自己的提交；
- 主仓库固定经过阅读或实验验证的 commit；
- 需要长期修改时先 fork，再更新 submodule URL；
- 阅读笔记写入 `docs/code-reading/`，并记录 URL 和 commit。

初始化：

```bash
git submodule update --init --recursive
```
