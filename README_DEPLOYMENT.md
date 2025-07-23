# Obsidian Agent 完整部署指南

这是一个完整的 Obsidian 智能助手解决方案，包含：
1. 基于 LangChain + Ollama qwen3:1.7b 的后端 Agent API 服务
2. 美观的 Obsidian 插件聊天界面
3. 与 Obsidian 笔记库的深度集成

## 🚀 快速开始

### 前置要求

1. **Ollama**: 下载并安装 [Ollama](https://ollama.ai/)
2. **Python 3.13+**: 确保已安装 Python
3. **uv**: Python 包管理器 (推荐) 或使用 pip
4. **Node.js 16+**: 用于构建 Obsidian 插件
5. **Obsidian**: 安装 Obsidian 应用

### 第一步：启动 Ollama 和下载模型

```bash
# 启动 Ollama 服务
ollama serve

# 下载 qwen3:1.7b 模型
ollama pull qwen3:1.7b
```

### 第二步：启动 Agent API 服务

```bash
# 进入项目目录
cd obsidian_agent

# 安装依赖
uv sync

# 启动 API 服务 (方式1: 使用启动脚本)
./start_agent.bat  # Windows
# 或
./start_agent.sh   # Linux/Mac

# 启动 API 服务 (方式2: 直接运行)
uv run python src/api_server.py
```

服务启动后，你可以访问：
- API 服务: http://127.0.0.1:8001
- API 文档: http://127.0.0.1:8001/docs

### 第三步：构建和安装 Obsidian 插件

```bash
# 进入插件目录
cd obsidian-plugin

# 安装依赖
npm install

# 构建插件
npm run build
```

### 第四步：安装插件到 Obsidian

1. 找到你的 Obsidian 保险库目录
2. 创建插件目录：`.obsidian/plugins/obsidian-agent-chat/`
3. 复制以下文件到该目录：
   - `main.js`
   - `manifest.json`
   - `styles.css`

```bash
# 示例命令 (替换为你的保险库路径)
mkdir -p "/path/to/your/vault/.obsidian/plugins/obsidian-agent-chat"
cp main.js manifest.json styles.css "/path/to/your/vault/.obsidian/plugins/obsidian-agent-chat/"
```

### 第五步：启用插件

1. 打开 Obsidian
2. 进入 设置 → 社区插件
3. 关闭安全模式（如果尚未关闭）
4. 在已安装插件列表中找到 "Obsidian Agent Chat"
5. 启用插件

## 🎯 使用方法

### 打开聊天界面

- **方式1**: 点击左侧边栏的机器人图标 🤖
- **方式2**: 使用命令面板 (Ctrl/Cmd + P)，搜索 "打开 Agent Chat"

### 配置插件

1. 进入 设置 → 插件选项 → Obsidian Agent Chat
2. 配置 API 服务器地址（默认：http://127.0.0.1:8001）
3. 点击"测试连接"确保连接正常

### 示例对话

```
用户: 列出我的所有笔记文件
Agent: 我来为你列出保险库中的所有文件...

用户: 搜索包含"Python"的笔记
Agent: 正在搜索包含"Python"的笔记内容...

用户: 帮我创建一个关于机器学习的新笔记
Agent: 我来帮你创建一个机器学习笔记...

用户: 今天的天气怎么样？
Agent: 当前天气是晴天，气温25°C。
```

## 🔧 高级配置

### API 服务器配置

在 `.env` 文件中可以配置：

```env
# API 服务器配置
API_HOST=127.0.0.1
API_PORT=8001

# Obsidian 连接配置
OBSIDIAN_API_KEY=your-api-key
OBSIDIAN_PROTOCOL=https
OBSIDIAN_HOST=127.0.0.1
OBSIDIAN_PORT=27124
OBSIDIAN_VERIFY_SSL=false

# MCP 配置
OBSIDIAN_MCP_IP=http://127.0.0.1:8000/sse/
```

### 插件开发模式

```bash
cd obsidian-plugin
npm run dev  # 启动监视模式，自动重新构建
```

## 🛠️ 故障排除

### 1. API 服务无法启动

**问题**: `Agent 初始化失败`
**解决方案**:
- 确保 Ollama 服务正在运行：`ollama serve`
- 确保模型已下载：`ollama list`
- 检查端口 8001 是否被占用

### 2. 插件无法连接到 API

**问题**: 聊天界面显示"未连接"
**解决方案**:
- 检查 API 服务是否运行：访问 http://127.0.0.1:8001/health
- 在插件设置中点击"测试连接"
- 确认 API 地址配置正确

### 3. 插件无法加载

**问题**: Obsidian 中看不到插件
**解决方案**:
- 确保文件复制到正确位置
- 检查 Obsidian 控制台错误信息 (Ctrl+Shift+I)
- 重新启动 Obsidian

### 4. 模型响应慢

**问题**: Agent 回复时间长
**解决方案**:
- 确保使用 GPU 加速（如果可用）
- 考虑使用更小的模型
- 检查系统资源使用情况

## 📁 项目结构

```
obsidian_agent/
├── src/
│   ├── api_server.py          # FastAPI 服务器
│   ├── qwen_agen.py          # LangChain Agent
│   ├── tools.py              # Obsidian 工具集成
│   └── ...
├── obsidian-plugin/
│   ├── main.ts               # 插件主代码
│   ├── styles.css            # 插件样式
│   ├── manifest.json         # 插件清单
│   └── ...
├── .env                      # 环境配置
├── pyproject.toml           # Python 依赖
├── start_agent.bat          # Windows 启动脚本
├── start_agent.sh           # Linux/Mac 启动脚本
└── README_DEPLOYMENT.md     # 本文件
```

## 🔄 更新和维护

### 更新 Agent 模型

```bash
# 下载新模型
ollama pull qwen3:latest

# 更新 qwen_agen.py 中的模型名称
# 重启 API 服务
```

### 更新插件

```bash
cd obsidian-plugin
npm run build
# 复制新的 main.js 到插件目录
# 在 Obsidian 中重新加载插件
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**享受与你的 Obsidian 智能助手的对话吧！** 🎉