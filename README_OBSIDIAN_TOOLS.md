# Obsidian 工具配置和使用指南

## 配置环境变量

在 `obsidian_agent` 目录下创建 `.env` 文件，包含以下配置：

```env
# Obsidian 连接配置
OBSIDIAN_API_KEY=your-api-key-here
OBSIDIAN_PROTOCOL=https
OBSIDIAN_HOST=127.0.0.1
OBSIDIAN_PORT=27124
OBSIDIAN_VERIFY_SSL=false

# MCP 配置
OBSIDIAN_MCP_IP=http://127.0.0.1:8000/sse
```

## 可用的 Obsidian 工具

### 1. 文件操作工具
- `list_files_in_vault` - 列出保险库中的所有文件
- `get_file_contents` - 获取指定文件的内容
- `get_batch_file_contents` - 获取多个文件的内容
- `put_content` - 写入文件内容（覆盖）
- `append_content` - 向文件追加内容
- `delete_file` - 删除文件

### 2. 搜索工具
- `search_files` - 搜索文件
- `search_json` - 使用JSON查询搜索

### 3. 周期性笔记工具
- `get_periodic_note` - 获取周期性笔记
- `get_recent_periodic_notes` - 获取最近的周期性笔记

### 4. 其他工具
- `get_recent_changes` - 获取最近的更改

## 使用方法

### 1. 测试连接
```bash
cd obsidian_agent
uv run python test_obsidian_tools.py
```

### 2. 运行 Agent
```bash
cd obsidian_agent
uv run python src/qwen_agen.py
```

## 示例问题

- "列出我的 Obsidian 保险库中的所有文件"
- "获取文件 'README.md' 的内容"
- "搜索包含 'Python' 的文件"
- "向文件 'notes.md' 追加内容 '今天学习了新的技术'"
- "获取今天的日记内容"
- "获取最近修改的5个文件"

## 注意事项

1. 确保 Obsidian 插件已正确安装并运行
2. 检查 API Key 是否正确配置
3. 确保网络连接正常
4. 如果使用 HTTPS，可能需要配置 SSL 证书 