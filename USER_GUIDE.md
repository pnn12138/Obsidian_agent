# Obsidian Agent Chat 插件使用指南

## 概述

Obsidian Agent Chat 是一个强大的 Obsidian 插件，它将 LangChain Agent 的能力集成到 Obsidian 中，让你可以通过自然语言与你的笔记进行智能交互。

## 功能特性

### 🤖 智能对话
- 与 AI Agent 进行自然语言对话
- 支持多种 LLM 提供商（Ollama、OpenAI、DeepSeek、Gemini、Qwen）
- 自动获取当前文档上下文
- 持续对话记录

### 🛠️ Obsidian 工具集成
- 创建、读取、更新、删除笔记
- 搜索文件和内容
- 文件格式转换
- 标签管理
- 链接分析

### 🎨 现代化界面
- 美观的聊天界面
- 实时连接状态显示
- 支持拖拽文件
- 响应式设计
- 深色主题支持

### ⚡ 便捷操作
- 侧边栏快速访问
- 右键菜单集成
- 选中文本分析
- 文档总结
- 快捷键支持

## 安装和配置

### 1. 安装插件

将插件文件复制到 Obsidian 插件目录：
```
.obsidian/plugins/obsidian_agent/
```

### 2. 启动 API 服务器

在插件目录中运行：
```bash
# Windows
start_agent.bat

# Linux/Mac
./start_agent.sh
```

或者手动启动：
```bash
uv run src/api_server.py
```

### 3. 配置插件

1. 在 Obsidian 设置中找到 "Agent Chat" 插件
2. 配置 API 服务器地址（默认：http://127.0.0.1:8001）
3. 选择 LLM 提供商和模型
4. 输入相应的 API 密钥（如需要）
5. 点击"测试 LLM 连接"验证配置

## 使用方法

### 基本对话

1. **打开聊天界面**
   - 点击侧边栏的机器人图标
   - 或使用命令面板搜索"打开 Agent Chat"

2. **开始对话**
   - 在输入框中输入你的问题
   - 按 Enter 或点击发送按钮
   - Agent 会自动获取当前文档上下文

### 右键菜单功能

#### 编辑器右键菜单
- **与Agent聊天**：打开聊天界面
- **分析选中文本**：分析当前选中的文本内容
- **总结当前文档**：生成当前文档的摘要

#### 文件列表右键菜单
- **与Agent讨论此文件**：讨论指定文件的内容

### 高级功能

#### 文件操作示例
```
请帮我创建一个名为"每日计划.md"的笔记，内容包含今天的待办事项。
```

#### 搜索和分析
```
搜索所有包含"项目管理"的笔记，并总结主要内容。
```

#### 格式转换
```
将当前笔记转换为 PDF 格式。
```

## 支持的 LLM 提供商

### Ollama（推荐本地使用）
- **模型示例**：qwen3:1.7b, llama3.2:3b
- **API 基础地址**：http://localhost:11434
- **优点**：完全本地运行，隐私安全

### OpenAI
- **模型示例**：gpt-4o-mini, gpt-4o
- **API 基础地址**：https://api.openai.com/v1
- **需要**：OpenAI API 密钥

### DeepSeek
- **模型示例**：deepseek-chat
- **API 基础地址**：https://api.deepseek.com
- **需要**：DeepSeek API 密钥

### Google Gemini
- **模型示例**：gemini-2.0-pro-exp
- **API 基础地址**：留空使用默认
- **需要**：Google API 密钥

### Qwen（通义千问）
- **模型示例**：qwen-plus, qwen-max
- **API 基础地址**：https://dashscope.aliyuncs.com/api/v1
- **需要**：阿里云 API 密钥

## 故障排除

### 常见问题

1. **连接失败**
   - 确保 API 服务器正在运行
   - 检查端口是否被占用（默认 8001）
   - 验证防火墙设置

2. **LLM 配置失败**
   - 检查 API 密钥是否正确
   - 验证模型名称是否存在
   - 确认网络连接正常

3. **工具执行失败**
   - 检查 Obsidian 权限设置
   - 确认文件路径正确
   - 查看控制台错误信息

### 调试模式

启用调试模式查看详细日志：
```bash
uv run src/api_server.py --debug
```

## 开发和自定义

### 添加自定义工具

在 `src/tools.py` 中添加新的工具函数：

```python
@tool
def my_custom_tool(param: str) -> str:
    """自定义工具的描述"""
    # 工具逻辑
    return "结果"
```

### 修改界面样式

编辑 `styles.css` 文件自定义界面外观。

### 扩展 LLM 支持

在相应的 agent 文件中添加新的 LLM 提供商支持。

## 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Obsidian UI   │◄──►│  TypeScript     │◄──►│   FastAPI       │
│   (前端界面)     │    │  Plugin         │    │   Server        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   LangChain     │
                                               │   Agent         │
                                               └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   LLM Provider  │
                                               │ (Ollama/OpenAI) │
                                               └─────────────────┘
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持多种 LLM 提供商
- 集成 Obsidian 工具
- 现代化聊天界面
- 右键菜单集成

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 邮箱：[your-email@example.com]

---

**享受与你的笔记的智能对话吧！** 🚀