# Obsidian Agent Chat Plugin

一个强大的 Obsidian 插件，让你可以直接在 Obsidian 中与基于 LangChain 的智能 Agent 进行对话。

## 功能特性

- 🤖 **智能对话**: 与基于 LangChain 的 Agent 进行自然语言对话
- 📝 **笔记管理**: Agent 可以帮助你管理 Obsidian 笔记库
- 🔍 **智能搜索**: 搜索和查找笔记内容
- 💬 **实时聊天**: 流畅的聊天界面，支持对话历史
- 🖱️ **右键菜单**: 在文档中右键快速访问 Agent 功能
- 🔄 **文件转换**: 集成 MarkItDown，支持 PDF、Word、Excel 等格式转换为 Markdown
- ⚙️ **灵活配置**: 可配置 API 服务器地址和连接设置

## 安装步骤

### 1. 启动 Agent API 服务

首先需要启动后端 Agent API 服务：

```bash
cd obsidian_agent
uv run python src/api_server.py
```

服务将在 `http://127.0.0.1:8001` 启动。

### 2. 构建插件

```bash
cd obsidian-plugin
npm install
npm run build
```

### 3. 安装到 Obsidian

将以下文件复制到你的 Obsidian 保险库的 `.obsidian/plugins/obsidian-agent-chat/` 目录：

- `main.js`
- `manifest.json`
- `styles.css`

### 4. 启用插件

1. 打开 Obsidian 设置
2. 进入"社区插件"
3. 启用"Obsidian Agent Chat"插件

## 使用方法

### 基本聊天功能
1. 点击左侧边栏的机器人图标，或使用命令面板搜索"打开 Agent Chat"
2. 在右侧边栏会出现聊天界面
3. 在输入框中输入你的问题或指令
4. Agent 会智能地帮助你管理笔记和回答问题

### 右键菜单功能
- **选中文本分析**: 在任意文档中选中文本，右键选择"分析选中文本"
- **文档总结**: 在文档中右键选择"总结当前文档"
- **文件讨论**: 在文件浏览器中右键文件，选择"讨论这个文件"

### 文件转换功能 (MarkItDown)
Agent 现在支持将多种文件格式转换为 Markdown：

**支持的格式**:
- PDF 文档
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx)
- Microsoft PowerPoint (.pptx)
- 图片文件 (PNG, JPG, etc.)
- 音频文件
- HTML 网页
- 网页 URL

**使用示例**:
```
# 转换本地文件
请帮我转换这个PDF文件：C:\path\to\document.pdf

# 转换网页内容
请将这个网页转换为Markdown：https://example.com/article

# 转换并保存到Obsidian
请将这个Word文档转换为Markdown并保存到我的笔记中：C:\path\to\document.docx
```

## 配置

在插件设置中，你可以配置：

- **API 服务器地址**: Agent API 服务的地址（默认: http://127.0.0.1:8001）
- **API 密钥**: 如果需要的话
- **自动连接**: 启动时自动连接到服务器

## 示例对话

### 基础笔记操作
- "列出我的所有笔记文件"
- "搜索包含 'Python' 的笔记"
- "帮我创建一个新的学习笔记"
- "总结一下我最近的笔记内容"

### 文件转换
- "请帮我转换这个PDF文件为Markdown：C:\Documents\report.pdf"
- "将这个网页内容转换为笔记：https://github.com/microsoft/markitdown"
- "转换这个Word文档并保存到我的笔记中：C:\Documents\meeting.docx"

### 智能分析
- "分析这段代码的功能"（配合右键菜单使用）
- "总结这个文档的要点"
- "这个文件讲的是什么内容？"

## 开发

### 开发模式

```bash
npm run dev
```

这会启动监视模式，当你修改代码时会自动重新构建。

### 构建生产版本

```bash
npm run build
```

## 依赖要求

- Obsidian 0.15.0+
- Node.js 16+
- 运行中的 Agent API 服务

## 故障排除

### 连接问题

1. 确保 Agent API 服务正在运行
2. 检查 API 地址配置是否正确
3. 在插件设置中点击"测试连接"

### 插件无法加载

1. 确保所有必需文件都已复制到插件目录
2. 检查 Obsidian 控制台是否有错误信息
3. 尝试重新启动 Obsidian

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！