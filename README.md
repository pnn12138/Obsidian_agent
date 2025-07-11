# Obsidian MCP Agent with Ollama

这个项目使用本地的 Ollama 运行 qwen:0.5b-chat 模型，并通过 MCP (Model Context Protocol) 与 Obsidian 笔记库交互。

## 环境要求

1. **Ollama**: 需要安装并运行 Ollama 服务
2. **Python 依赖**: 安装所需的 Python 包
3. **Obsidian MCP 服务器**: 需要运行 Obsidian MCP 服务器

## 安装步骤

### 1. 安装 Ollama
```bash
# 下载并安装 Ollama
# 访问 https://ollama.ai/ 下载安装包

# 启动 Ollama 服务
ollama serve

# 下载 qwen:0.5b-chat 模型
ollama pull qwen:0.5b-chat
```

### 2. 安装 Python 依赖
```bash
cd obsidian_agent
pip install -r requirements.txt
```

### 3. 启动 Obsidian MCP 服务器

本项目依赖 [Obsidian MCP Server](https://github.com/pnn12138/obsidian_fastmcp) 作为后端 API 服务。

请先前往 [obsidian_fastmcp 仓库](https://github.com/pnn12138/obsidian_fastmcp) 按照说明启动 MCP 服务。

**快速指引：**

1. 克隆 [obsidian_fastmcp](https://github.com/pnn12138/obsidian_fastmcp) 仓库到本地
2. 按照该仓库的 README 配置环境变量和依赖
3. 启动 MCP 服务（通常为 `python src/server.py` 或 `python -m obsidian_mcp --port 8000`）

详细步骤请参考 [obsidian_fastmcp 的 README](https://github.com/pnn12138/obsidian_fastmcp#readme)。

### 4. 测试连接
```bash
# 测试 Ollama 连接
python test_ollama_simple.py

# 如果一切正常，运行主程序
python src/qwen_agen.py
```

## 配置

在 `.env` 文件中配置 MCP 服务器地址：
```
OBSIDIAN_MCP_IP=http://127.0.0.1:8000/sse
```

## 使用说明

1. 确保 Ollama 服务正在运行 (`ollama serve`)
2. 确保 Obsidian MCP 服务器正在运行
3. 运行 `python src/qwen_agen.py`
4. 程序会自动连接到 Ollama 的 qwen:0.5b-chat 模型
5. 通过自然语言与 Obsidian 笔记库交互

## 故障排除

### Ollama 连接问题
- 检查 Ollama 服务是否运行: `ollama list`
- 检查模型是否已下载: `ollama list`
- 测试 API 连接: `python test_ollama_simple.py`

### MCP 服务器问题
- 确保 MCP 服务器在正确的端口运行
- 检查 `.env` 文件中的地址配置
- 确保 Obsidian 笔记库路径正确

### 依赖问题
- 重新安装依赖: `pip install -r requirements.txt`
- 检查 Python 版本兼容性
