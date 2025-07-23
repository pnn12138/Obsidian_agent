# Obsidian Agent Chat Plugin

🤖 **将 LangChain Agent 的强大能力带入 Obsidian！**

一个智能的 Obsidian 插件，让你可以通过自然语言与笔记进行交互，执行各种笔记管理任务。

## ✨ 主要特性

- 🗣️ **智能对话**：与 AI Agent 进行自然语言对话
- 🛠️ **工具集成**：创建、搜索、编辑笔记，文件格式转换
- 📄 **文件转换**：Markitdown 支持 PDF、Word、Excel 等格式转换
- 🛑 **停止控制**：可随时中断 AI 回答，重新开始对话
- 🎨 **现代界面**：美观的聊天界面，支持深色主题
- ⚡ **便捷操作**：右键菜单、快捷键、拖拽支持
- 🔌 **多 LLM 支持**：Ollama、OpenAI、DeepSeek、Gemini、Qwen

## 🚀 快速开始

### 1. 安装依赖
```bash
# 安装 uv（Python 包管理器）
pip install uv

# 安装项目依赖
uv sync
```

### 2. 启动服务
```bash
# Windows
start_agent.bat

# Linux/Mac
./start_agent.sh
```

### 3. 配置插件
1. 在 Obsidian 中启用插件
2. 配置 LLM 提供商和模型
3. 测试连接
4. 开始聊天！

## 📖 详细文档

- [📚 完整使用指南](USER_GUIDE.md)
- [🚀 快速开始](GETTING_STARTED.md)
- [🔧 部署指南](README_DEPLOYMENT.md)
- [🛠️ Obsidian 工具](README_OBSIDIAN_TOOLS.md)

## 🎯 使用示例

```
用户：请帮我创建一个名为"项目计划.md"的笔记，包含项目的基本结构。

Agent：我来帮你创建项目计划笔记...
✅ 已创建笔记：项目计划.md
内容包含：项目概述、目标、时间线、资源分配等结构。

用户：搜索所有包含"会议"的笔记并总结。

Agent：正在搜索相关笔记...
找到 5 个包含"会议"的笔记，主要内容包括：
- 周例会记录
- 项目启动会议
- 客户需求讨论
...

用户：[使用 Markitdown 转换功能]
📄 选择 PDF 文件 → 转换为 Markdown → 保存到笔记库
✅ 文件转换成功！支持 PDF、Word、Excel、PowerPoint 等格式
```

## 🏗️ 技术架构

```
Obsidian Plugin (TypeScript) ←→ FastAPI Server ←→ LangChain Agent ←→ LLM
```

## 🔧 开发

### 构建插件
```bash
npm install
npm run build
```

### 运行测试
```bash
uv run test_plugin.py
```

## 📝 更新日志

### v1.1.0 (2024-01-XX) - 最新版本 🆕
- 🛑 **停止控制**：添加停止按钮，可中断 AI 回答
- 📄 **Markitdown 集成**：支持 PDF、Word、Excel 等文件转换
- 🎨 **UI 增强**：专用转换界面，批量文件处理
- ⚙️ **设置优化**：新增功能开关，更好的配置管理
- 🔧 **API 扩展**：新增 `/convert-file` 端点

### v1.0.0 (2024-01-XX)
- 🎉 初始版本发布
- ✅ 多 LLM 提供商支持
- ✅ Obsidian 工具集成
- ✅ 现代化聊天界面
- ✅ 右键菜单集成

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**让你的笔记变得更智能！** 🚀