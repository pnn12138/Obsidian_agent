# 🤖 Obsidian Agent Chat - 完整解决方案

## 📋 项目概述

这是一个完整的 Obsidian 智能助手解决方案，包含：

1. **后端 Agent API 服务** - 基于 LangChain + Ollama qwen3:1.7b
2. **Obsidian 插件** - 美观的聊天界面
3. **深度集成** - 与 Obsidian 笔记库的无缝交互

## 🎯 主要功能

### Agent 能力
- 📝 **笔记管理**: 列出、搜索、创建、编辑、删除笔记
- 📅 **日期笔记**: 处理日记、周记、月记等周期性笔记
- 🔍 **智能搜索**: 基于内容的语义搜索
- 💬 **自然对话**: 流畅的中文对话体验
- 🧠 **上下文记忆**: 保持对话历史和上下文

### 插件特性
- 🎨 **美观界面**: 现代化的聊天 UI 设计
- 🌙 **主题适配**: 支持 Obsidian 的明暗主题
- ⚡ **实时通信**: 与 Agent API 的实时交互
- ⚙️ **灵活配置**: 可自定义 API 服务器地址
- 🔄 **状态管理**: 连接状态显示和错误处理

## 🚀 快速开始

### 1. 启动 Agent API 服务

```bash
# 方式1: 使用启动脚本
cd obsidian_agent
./start_agent.bat  # Windows

# 方式2: 手动启动
ollama serve
ollama pull qwen3:1.7b
uv sync
uv run python src/api_server.py
```

### 2. 构建和安装插件

```bash
# 构建插件
cd obsidian-plugin
npm install
npm run build

# 安装到 Obsidian
./install_plugin.bat "C:\path\to\your\vault"  # Windows
./install_plugin.sh "/path/to/your/vault"     # Linux/Mac
```

### 3. 启用插件

1. 重启 Obsidian
2. 设置 → 社区插件 → 关闭安全模式
3. 启用 "Obsidian Agent Chat" 插件
4. 点击左侧边栏的机器人图标 🤖

## 📁 项目结构

```
obsidian_agent/
├── src/
│   ├── api_server.py          # FastAPI 服务器
│   ├── qwen_agen.py          # LangChain Agent 核心
│   ├── tools.py              # Obsidian 工具集成
│   └── ...
├── obsidian-plugin/
│   ├── main.ts               # 插件主代码 (TypeScript)
│   ├── main.js               # 编译后的插件代码
│   ├── styles.css            # 插件样式
│   ├── manifest.json         # 插件清单
│   ├── install_plugin.bat    # Windows 安装脚本
│   ├── install_plugin.sh     # Linux/Mac 安装脚本
│   └── ...
├── .env                      # 环境配置
├── pyproject.toml           # Python 依赖
├── start_agent.bat          # Windows 启动脚本
├── start_agent.sh           # Linux/Mac 启动脚本
├── README_DEPLOYMENT.md     # 详细部署指南
└── README_PROJECT.md        # 本文件
```

## 🔧 技术栈

### 后端
- **Python 3.13+** - 主要编程语言
- **LangChain** - Agent 框架
- **Ollama** - 本地 LLM 运行环境
- **qwen3:1.7b** - 轻量级中文大语言模型
- **FastAPI** - Web API 框架
- **uvicorn** - ASGI 服务器

### 前端 (Obsidian 插件)
- **TypeScript** - 类型安全的 JavaScript
- **Obsidian API** - 插件开发框架
- **esbuild** - 快速构建工具
- **CSS3** - 现代样式设计

## 🎨 界面预览

### 聊天界面
- 清晰的消息气泡设计
- 用户消息（右侧，蓝色）
- Agent 回复（左侧，灰色）
- 加载动画和状态指示
- 响应式设计，适配不同屏幕

### 设置界面
- API 服务器地址配置
- 连接测试功能
- 实时状态显示

## 💡 使用示例

```
用户: 列出我的所有笔记
Agent: 我来为你列出保险库中的所有文件...
[显示文件列表]

用户: 搜索包含"机器学习"的笔记
Agent: 正在搜索包含"机器学习"的笔记...
[显示搜索结果]

用户: 帮我创建一个关于深度学习的新笔记
Agent: 我来帮你创建一个深度学习笔记...
[创建并显示新笔记]

用户: 今天的天气怎么样？
Agent: 抱歉，我主要专注于帮助你管理 Obsidian 笔记。你可以问我关于笔记管理的问题。
```

## 🔄 开发和维护

### 开发模式
```bash
# API 服务开发
cd obsidian_agent
uv run python src/api_server.py

# 插件开发
cd obsidian-plugin
npm run dev  # 监视模式，自动重新构建
```

### 更新流程
1. 修改代码
2. 重新构建插件：`npm run build`
3. 重启 Obsidian 或重新加载插件
4. 测试新功能

## 🛠️ 故障排除

### 常见问题
1. **API 服务无法启动** - 检查 Ollama 服务和模型
2. **插件无法连接** - 验证 API 地址和端口
3. **插件无法加载** - 检查文件权限和路径
4. **响应速度慢** - 考虑硬件配置和模型大小

### 调试技巧
- 查看 Obsidian 控制台 (Ctrl+Shift+I)
- 检查 API 服务日志
- 使用 API 文档页面测试 (http://127.0.0.1:8001/docs)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境设置
1. Fork 项目
2. 创建功能分支
3. 安装依赖并测试
4. 提交 PR

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

- Obsidian 团队 - 优秀的笔记应用
- LangChain 社区 - 强大的 Agent 框架
- Ollama 项目 - 便捷的本地 LLM 运行环境
- Qwen 团队 - 优秀的中文语言模型

---

**开始你的智能笔记之旅吧！** 🎉