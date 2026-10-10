# Reaction Canvas · 化学反应图示助手

**截图 → 反应候选 → 结构示意图。** 一个轻量桌面研发助手：自带模型服务，本机用 RDKit 绘图。

[English](README.md) · [安装与使用](docs/GETTING_STARTED.md) · [隐私与数据流](docs/PRIVACY.md) · [路线图](docs/ROADMAP.md)

![内置示例的讨论界面](assets/demo-main.png)

图中为乙酸与乙醇的固定演示数据，不代表真实模型测试结果。

## 已实现

- `⌘/Ctrl + Shift + Space` 快捷截图，结果在屏幕右侧面板显示；展开后继续同一个任务。
- 图片粘贴、拖入、上传与文字讨论；保留草稿、历史和任务上下文。
- 用户自行配置硅基流动或兼容 API；可连接已有本机模型服务，不附带大模型权重。
- 用模型返回的 SMILES 在本机绘制结构，复制图或导出 SVG/PNG，保留条件与不确定性。
- 请求取消、本机历史备份/恢复、无需联网的内置示例。

## 安装与真实状态

[Releases](https://github.com/tracy586ymz-eng/reaction-canvas/releases) 用于提供已发布安装包；操作步骤见[使用指南](docs/GETTING_STARTED.md)。Mac 通用包已在本机构建，Apple 芯片实机检查通过；Intel 实机未验证，尚无正式签名、公证。Windows 源码与安装器流程已提供，安装运行仍待验证。界面目前为简体中文。

首次真实分析需要在设置中填写自己的服务、密钥和模型，确认视觉能力、当前价格及传输许可。软件不能通过模型名称保证免费。**不要把 API Key、客户图片或真实调用记录发到公开 Issue。**

这是实验性研发辅助工具。真实模型化学准确率尚未测定，图像识别和反应预测都可能错误。RDKit 能画出结构，不等于反应可行；图为结构转化示意，未验证完整配平。没有自动文献证据检索、专用化学模型组合或独立结构识别模型。详见[验证边界](docs/VALIDATION.md)。

## 开发与参与

```sh
cd source/desktop
npm ci
node scripts/generate-notices.mjs
npm test
npm run tauri -- dev
```

需要 Node 24、Rust 与平台构建工具；安装版用户不需要这些环境或独立显卡。[构建说明](source/desktop/BUILD.md)。欢迎贡献英文界面、Windows 验证、供应商兼容测试和带负样本的化学评测集。[贡献指南](CONTRIBUTING.md)。

如果这个交互对你有帮助，欢迎 Star，让更多人发现它；可复现的问题和小型 PR 同样有价值。原始项目代码采用 MIT，Tauri、React、RDKit.js 等依赖保留各自许可。
