# Music AI Roadmap

一个面向音乐 AI 学习者的交互式 52 周路线网站。路线把机器学习、音频信号处理、
MIR、符号音乐、个人兴趣项目、乐理和钢琴练习组织在同一套每周计划中。

网站提供两种阅读方式：

- **按学习内容**：查看知识主题、前置要求、资料和阶段成果；
- **按周推进**：逐周查看目标、阅读、源码、练习、项目、乐理、钢琴和验收标准。

## 与根仓库的关系

`roadmap/` 是 `music-ai-lab` 中独立构建的前端应用。它只保存路线网站和结构化路线
数据，不存放 Python 学习代码、Notebook、数据集、模型权重或实验产物。

根仓库中的学习内容以路线为导航，但不要求目录与周次一一绑定。阶段练习应放在
`../learning/`、`../notebooks/` 或 `../projects/`，周计划和复盘放在
`../docs/weekly/`。

## 技术栈

- Next.js 16；
- React 19；
- TypeScript；
- Vinext、Vite 与 Cloudflare Workers；
- OpenAI Sites 托管配置。

Node.js 版本要求为 22.13.0 或更高。

## 本地运行

安装锁文件声明的依赖：

```bash
npm ci
```

启动开发服务器：

```bash
npm run dev
```

终端会打印本地访问地址。修改页面或路线数据后，开发服务器会自动刷新。

## 路线数据

路线内容的权威来源是：

```text
app/data/roadmap.json
```

相关文件：

```text
app/data/types.ts       TypeScript 数据结构
app/data/roadmap.ts     JSON 导入与类型连接
app/page.tsx            两个视图及交互逻辑
app/globals.css         页面布局和视觉样式
app/layout.tsx          标题、描述和分享元数据
```

修改路线时应保持以下约束：

- 周次从 1 到 52，不能缺失或重复；
- 每周必须包含目标、资料、源码阅读、练习、项目、乐理、钢琴、交付物和验收标准；
- 每周建议投入保持在 24～28 小时；
- 阅读资料和源码地址使用 HTTPS；
- 阶段、分类和延伸方向的数量与页面结构保持一致。

## 校验

提交路线改动前运行：

```bash
npm run validate:data
npm run typecheck
npm run lint
npm run build
```

各命令的职责：

| 命令 | 作用 |
|---|---|
| `npm run validate:data` | 检查 52 周数据结构和完整性 |
| `npm run typecheck` | 运行 TypeScript 静态检查 |
| `npm run lint` | 检查前端源码规范 |
| `npm run build` | 生成可部署的生产构建 |

## 部署

站点通过 OpenAI Sites 发布，项目标识保存在 `.openai/hosting.json`。不要删除或手工
替换其中的 `project_id`，也不要把部署凭据写入仓库。发布前必须先完成上述四项校验。

构建输出、依赖目录和本地托管状态均为生成内容，不提交到 Git：

```text
node_modules/
dist/
.next/
.vinext/
.wrangler/
```
