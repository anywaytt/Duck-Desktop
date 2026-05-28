# 🦆 Duck Desktop

> **Hermes Agent 智能桌面客户端** — 有温度的 AI 工作台

Duck Desktop 是一个基于 Electron + React + Vite 构建的桌面应用，为 Hermes Agent 提供可视化控制界面。它不仅是一个 AI 客户端，更是一个有温度的工作台——配备浮动宠物、记忆系统、工具箱、知识库和语音交互。

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🖥️ **控制面板** | 系统监控（CPU/GPU/内存）、模型切换、Token 用量追踪、会话管理 |
| 🦆 **桌面宠物** | 浮动鸭子窗口，支持喂食、心情、衣橱，唤醒词「嘿DD」 |
| 🧠 **记忆系统** | AI 助手持久记忆，跨会话上下文感知 |
| 🔧 **工具箱** | 快捷工具入口，提升工作效率 |
| 📚 **知识库** | 内置知识库管理，快速检索信息 |
| 🎙️ **语音交互** | 语音唤醒 + TTS 语音回复 |
| 📊 **设备监控** | 实时 CPU/GPU/内存负载监控 |
| 🔄 **自动更新** | 一键检查和更新 Hermes Agent |

---

## 🏗️ 项目结构

```
Duck Desktop Pack/
├── src/                    # React 前端源码
│   ├── App.tsx             # 主应用组件
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx   # 控制面板
│   │   └── SetupPage.tsx   # 安装引导
│   ├── components/         # UI 组件
│   ├── hooks/              # React Hooks
│   ├── lib/                # 工具库
│   └── styles/             # 样式文件
├── electron/               # Electron 主进程
│   ├── main.cjs            # 主进程入口
│   ├── preload.cjs         # preload 桥接
│   ├── hermes-cli.cjs      # Hermes CLI 交互
│   ├── pet.html            # 桌面宠物窗口
│   ├── inject/             # 注入到 Hermes Web UI 的脚本
│   │   ├── unified-sidebar.js  # 侧边栏
│   │   ├── knowledge.js    # 知识库面板
│   │   ├── settings.js     # 设置面板
│   │   ├── skillhub.js     # 技能中心
│   │   └── ...             # 更多注入脚本
│   └── *.py                # 语音/扫描等辅助 Python 脚本
├── public/                 # 静态资源
├── dist/                   # Vite 构建输出
├── release/                # 打包输出
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🚀 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 同时启动前端开发服务器 + Electron
npm run dev

# 或分开启动
npm run dev:web     # 仅 Web (Vite)
npm run dev:electron # 仅 Electron
```

### 构建打包

```bash
# 构建前端
npm run build

# 打包为可执行文件
npm run build:package
```

### 启动应用

双击 `release/Duck Desktop-win32-x64/Duck Desktop.exe` 即可启动。\
或双击项目根目录的 `启动DuckDesktop.bat` 一键自动启动。

启动全程自动化——检测 Hermes 环境、启动 Web 服务、加载控制面板，无需手动干预。

---

## 📋 系统要求

- **操作系统**: Windows 10/11 64-bit
- **运行时**: Node.js 18+、Python 3.10+
- **Hermes Agent**: 已安装并配置

---

## ⚙️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | React 19 + TypeScript |
| **构建工具** | Vite 6 |
| **样式方案** | Tailwind CSS 3 |
| **桌面框架** | Electron 28 |
| **图表** | Recharts |
| **图标** | Lucide React |
| **UI 组件** | 自定义组件 + Tailwind |

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request 来改进 Duck Desktop！

---

## 📄 许可证

[MIT](LICENSE)

---

## 🦐 致谢

Duck Desktop 是大小姐和虾米一起创造的有温度的作品。\
不是为了替代终端，而是给 AI 一个可以住下来的「家」。
