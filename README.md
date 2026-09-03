# 练遇 LIANYU

面向日常健身的中文网站：根据当日状态安排训练，也可以自己编排动作、记录进展、分享日常。

**[在线体验](https://lianyu-fitness-0903.m2195733.chatgpt.site/)** · 电脑与手机均可使用

## 功能

| 模块 | 已实现的功能 |
| --- | --- |
| 今日推荐与 AI 教练 | 个人档案、睡眠/精力/恢复反馈、四档规则推荐，以及服务端 DeepSeek 结构化计划生成 |
| 自主训练 | 12 个动作、器械筛选、模板、排序、组次/重量/休息编辑、计时与逐组完成 |
| 运动社区 | 共享文字动态、评论、点赞、自己的动态删除、举报与管理员处理 |
| 我的数据 | 私人训练记录、打卡日历、手动身体数据、课程进度、导出与删除 |
| 课程与活动 | 三门示例文字课程、学习进度，以及标明测试性质的报名、名额确认与取消 |

今日推荐的标准时长为 60 / 45 / 30 / 15 分钟：两项状态都好、一项一般、两项一般、疲惫或恢复较差。推荐不会超过档案中填写的可用时间；组次和休息也会随状态调整。身体不适时暂停推荐。规则推荐与生成式 AI 在界面中分别标明。

## 使用边界

- 访客可先使用浏览器内的训练体验，主动同意后启用私人云端记录。普通访客不需要提供 API 密钥。
- 当前身份绑定浏览器的访问凭证，尚无跨设备账号或身份找回；清除 Cookie 后不能自动找回原身份。支持导出个人备份，尚未提供备份导入。
- 报名项目是流程测试，没有真实线下活动、中奖或名额承诺。当前没有收费、充值或支付功能。
- 训练建议和示意图片用于一般体验，需要结合个人能力调整，不替代个体评估或真人动作指导。

## 本地运行

使用 Node.js 24 和 pnpm。本地数据库适配器使用 Node 内置 `node:sqlite`；本项目在 Node.js 24.19.0 上验证过。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址。本地开发服务会创建 `.local/development.sqlite`，提供私人记录、文字社区和测试报名；这些是本机开发数据，与线上网站的数据分开保存。

**本地开发服务默认关闭真实 AI。** 当前 `scripts/local-api-plugin.mjs` 不自动读取 `.env`；仅复制 `.env.example` 不会启用模型。该文件用于说明线上运行时需要的配置。

```bash
pnpm build
pnpm test
```

构建输出为 `dist/client` 和 `dist/server/index.js`。源码对应的发布版本通过了 33 项测试，包括推荐分档、私人记录隔离、更新冲突、社区权限、报名名额及 AI 额度控制。

## 线上部署

当前示例站运行在支持 Cloudflare Workers 与 D1 的 Sites 托管环境。GitHub 仓库用于保存和分享源码，在线体验可继续使用上方链接。

自行部署需要提供 Worker 运行环境、名为 `DB` 的 D1 绑定，以及前端静态资源绑定。按顺序应用 `.openai/drizzle` 中的数据库迁移。

导出包的 `.openai/hosting.json` 只保留逻辑绑定，已移除示例站的项目 ID。请为自己的站点配置自己的项目和数据库。

| 运行时配置 | 用途 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 在服务端密钥管理中配置自己的模型密钥 |
| `AI_ENABLED` | 配置模型、限制和运行环境后设为 `true` |
| `AI_BUDGET_MICRO` | 全站累计调用预算预留上限；示例值 5000000 对应 5 元 |
| `COMMUNITY_ENABLED` | 管理员配置完成后启用共享社区 |
| `ADMIN_SITE_USER_ID` | 平台认证后的站点管理员身份 |

示例 AI 限制为每个浏览器身份每月 4 次、每次预留 0.10 元、全站累计预留 5 元。失败请求保留预留额；这是应用调用限制，不是整个模型账号的账单上限。源码不含示例站的额度、账户访问权或生产数据。

管理员认证依赖托管平台提供并防伪的 `oai-authenticated-user-id` 请求头。迁移到其他平台时，需要接入可验证的身份机制，不能直接信任客户端传来的同名请求头。

GitHub Pages 提供静态网站托管，本项目的 AI、数据库与共享社区需要后端，不能只靠 Pages 承载完整功能。见 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。

## 项目结构

```text
src/                React 页面、训练规则、云端状态同步
worker/             后端接口、DeepSeek 调用与校验
db/                 数据库结构定义
.openai/drizzle/    数据库迁移
scripts/            本地开发适配与构建整理
tests/              功能与打包验证
public/images/      本项目生成的示意图片
```

技术栈：React、Vite、Cloudflare Workers 兼容入口、D1/SQLite、Drizzle、DeepSeek API。

## 参考与素材

功能思路参考 [Trainer](https://github.com/Yuvasee/trainer)、[Workout.cool](https://github.com/Snouzy/workout-cool) 与 [Liftosaur](https://github.com/astashov/liftosaur)。这些链接用于致谢和了解设计思路；本项目没有直接复制它们的代码，也没有继承其验证结论。

图片为本项目生成的示意素材；图标来自 `@phosphor-icons/react`。第三方依赖各自遵循其许可证。

## 许可证

项目作者尚未选择项目代码的开源许可证，本包不附带 `LICENSE`，也不代表已授予开源再使用许可。若要正式开源，请由作者选择并加入许可证；参考 [GitHub 的许可证说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)。
