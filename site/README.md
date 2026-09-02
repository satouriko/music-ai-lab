# Music AI Lab Site

这是 `music-ai-lab` 的只读浏览网站。路线是唯一主入口；笔记、代码和 Notebook 都是
路线周节点下的学习证据，而不是彼此独立的内容仓库。

## 内容模型

```text
../roadmap/roadmap.json    52 周路线、阶段与能力域
../roadmap/artifacts.json  学习产物与周次、能力域的显式关系
../docs/                   周记与源码阅读笔记
../learning/               学习练习与紧邻测试
../projects/               阶段项目代码
../tests/                  仓库级 Python 测试
../notebooks/              实验 Notebook
```

`artifacts.json` 为每项内容声明稳定 ID、类型、所属周次和能力域。代码产物还声明根
目录、唯一入口文件及辅助/测试文件。内容生成会拒绝未知周次、重复归属、路径穿越、
缺失文件和未被任何产物收纳的孤立内容，防止网页悄悄变回全仓库文件列表。
`docs/weekly/README.md` 与 `docs/code-reading/README.md` 只说明目录约定，不作为笔记展示。

主要路由：

- `/` 与 `/roadmap`：按周或能力域阅读路线，并在周节点进入关联产物；
- `/artifacts/:id`：带路线语境的笔记、代码或 Notebook 详情；
- `/notes/:path`、`/code/:path`、`/notebooks/:path`：兼容精确内容链接，同时显示所属周次；
- `/notes`、`/code`、`/notebooks`：重定向回路线，不提供独立总目录。

笔记页使用正文与粘性目录的双栏阅读布局，窄屏切换为正文前的折叠目录；Markdown
围栏代码和普通源码都由 Shiki 高亮，并使用明确的等宽字体栈。

## 构建边界

开发与构建开始前，`scripts/build-content.mjs` 会扫描白名单目录，校验路线和产物关系，
再生成被 Git 忽略的 `.generated/content.json`。它只是可重建的构建缓存，不是内容的
权威来源。GitHub Pages 只分发构建生成的静态文件，不会执行 Python 或 Notebook。

技术栈为 Next.js 16、React 19、TypeScript、Vinext/Vite、React Markdown、
remark-gfm、remark-math、KaTeX 与 Shiki JavaScript 正则引擎。Node.js 版本要求为
22.13.0 或更高。

## 本地运行

```bash
npm ci
npm run dev -- --hostname 0.0.0.0
```

根目录内容变化后重新启动开发服务器，以重新生成内容索引。在 WSL 中需要从 Windows
浏览器访问时，使用 WSL IP 和终端显示的端口，而不是 `localhost`。

只刷新生成索引时也可以运行 `npm run generate:content`；网站内容仍应修改在仓库根目录，
不要直接编辑 `.generated/content.json`。

## 校验

```bash
npm test
npm run validate:data
npm run typecheck
npm run lint
npm run build:pages
npm run test:pages
```

| 命令 | 作用 |
|---|---|
| `npm test` | 检查产物关系、内容扫描、路径安全、标题目录、Notebook 解析和代码高亮 |
| `npm run validate:data` | 检查 52 周路线和关联产物的结构、完整性与所有权 |
| `npm run typecheck` | 生成内容后运行 TypeScript 静态检查 |
| `npm run lint` | 生成内容后检查网页源码规范 |
| `npm run build:pages` | 生成内容，构建并整理 GitHub Pages 静态产物 |
| `npm run test:pages` | 验收目录式路由、项目子路径、元数据与真实浏览器导航 |

## 部署

`main` 分支更新后，GitHub Actions 会完成完整校验并将静态导出发布到
<https://satouriko.github.io/music-ai-lab/>。GitHub Pages 使用 `/music-ai-lab`
项目子路径；`npm run build:pages` 和 `npm run test:pages` 分别生成并验收同样的产物。

以下内容都不提交 Git：

```text
.generated/
node_modules/
dist/
.next/
.vinext/
```
