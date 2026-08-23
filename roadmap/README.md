# Roadmap

这里保存 Music AI Lab 的路线数据，人和 AI 都可以直接阅读、检查和修改，不需要启动
网站。

- `roadmap.json` 定义 52 周、阶段、能力域和延伸方向。
- `artifacts.json` 把真实笔记、代码练习和 Notebook 显式关联到一个或多个周次。

新增可展示内容时同时更新 `artifacts.json`。网站构建会拒绝失效关联、重复归属以及没有
关联到 roadmap 的孤立内容。

网页展示代码位于 `../site/`。修改路线后从仓库根目录执行：

```bash
cd site
npm run validate:data
```

校验会检查 52 个周次、阶段、能力域、延伸方向、学习产物关联、资料链接和每周时间预算。
