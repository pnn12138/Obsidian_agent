#!/bin/bash

echo "正在安装 Obsidian Agent Chat 插件..."

# 检查是否提供了保险库路径参数
if [ $# -eq 0 ]; then
    echo "使用方法: ./install_plugin.sh \"/path/to/your/vault\""
    echo "请提供你的 Obsidian 保险库路径"
    exit 1
fi

VAULT_PATH="$1"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/obsidian-agent-chat"

echo "保险库路径: $VAULT_PATH"
echo "插件目录: $PLUGIN_DIR"

# 检查保险库路径是否存在
if [ ! -d "$VAULT_PATH" ]; then
    echo "错误: 保险库路径不存在: $VAULT_PATH"
    exit 1
fi

# 创建插件目录
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "创建插件目录..."
    mkdir -p "$PLUGIN_DIR"
fi

# 复制插件文件
echo "复制插件文件..."
cp "main.js" "$PLUGIN_DIR/main.js"
cp "manifest.json" "$PLUGIN_DIR/manifest.json"
cp "styles.css" "$PLUGIN_DIR/styles.css"

echo ""
echo "✅ 插件安装完成！"
echo ""
echo "接下来的步骤:"
echo "1. 重启 Obsidian"
echo "2. 进入 设置 → 社区插件"
echo "3. 关闭安全模式（如果尚未关闭）"
echo "4. 在已安装插件列表中启用 \"Obsidian Agent Chat\""
echo "5. 确保 Agent API 服务正在运行 (http://127.0.0.1:8001)"
echo ""