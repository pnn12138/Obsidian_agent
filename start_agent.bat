@echo off
REM Obsidian Agent 启动脚本 (Windows)

echo === Obsidian Agent 启动脚本 ===

REM 检查是否在正确的目录
if not exist "pyproject.toml" (
    echo 错误: 请在 obsidian_agent 项目根目录运行此脚本
    pause
    exit /b 1
)

REM 检查 Ollama 是否运行
echo 检查 Ollama 服务状态...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo 警告: Ollama 服务未运行，请先启动 Ollama
    echo 运行: ollama serve
    pause
    exit /b 1
)

REM 检查模型是否存在
echo 检查 qwen3:1.7b 模型...
ollama list | findstr "qwen3:1.7b" >nul
if errorlevel 1 (
    echo 模型 qwen3:1.7b 未找到，正在下载...
    ollama pull qwen3:1.7b
)

REM 安装 Python 依赖
echo 安装 Python 依赖...
uv sync

REM 启动 API 服务器
echo 启动 Agent API 服务器...
echo 服务地址: http://127.0.0.1:8001
echo API 文档: http://127.0.0.1:8001/docs
echo.
echo 按 Ctrl+C 停止服务

uv run python src/api_server.py