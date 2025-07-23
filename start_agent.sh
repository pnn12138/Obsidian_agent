#!/bin/bash

# Obsidian Agent 启动脚本

echo "=== Obsidian Agent 启动脚本 ==="

# 检查是否在正确的目录
if [ ! -f "pyproject.toml" ]; then
    echo "错误: 请在 obsidian_agent 项目根目录运行此脚本"
    exit 1
fi

# 检查 Ollama 是否运行
echo "检查 Ollama 服务状态..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "警告: Ollama 服务未运行，请先启动 Ollama"
    echo "运行: ollama serve"
    exit 1
fi

# 检查模型是否存在
echo "检查 qwen3:1.7b 模型..."
if ! ollama list | grep -q "qwen3:1.7b"; then
    echo "模型 qwen3:1.7b 未找到，正在下载..."
    ollama pull qwen3:1.7b
fi

# 安装 Python 依赖
echo "安装 Python 依赖..."
uv sync

# 启动 API 服务器
echo "启动 Agent API 服务器..."
echo "服务地址: http://127.0.0.1:8001"
echo "API 文档: http://127.0.0.1:8001/docs"
echo ""
echo "按 Ctrl+C 停止服务"

uv run python src/api_server.py