import os
import requests
from dotenv import load_dotenv
from sseclient import SSEClient
# 正确导入千问
from langchain_community.chat_models import ChatTongyi
from fastmcp.client import Client
# pip install sseclient-py
import asyncio
# 1) 载入 .env
load_dotenv()

# 导入 markitdown <mcreference link="https://github.com/microsoft/markitdown" index="1">1</mcreference>
try:
    from markitdown import MarkItDown
    MARKITDOWN_AVAILABLE = True
except ImportError:
    MARKITDOWN_AVAILABLE = False
    print("警告: markitdown 未安装，文档转换功能将不可用")

# 2) 使用 SSE 从 MCP 获取工具列表

from langchain.tools import StructuredTool, Tool
from langchain.agents import initialize_agent, Tool
from pydantic import BaseModel, Field
from typing import List, Optional

# 导入 Obsidian 类
import sys
sys.path.append('../obsidian_fastmcp/src')
from obsidian import Obsidian

def make_tool_func(client, tool):
    
    async def tool_func(**kwargs):
        print("调用了")
        """{}""".format(tool.description or tool.name)
        result = await client.call_tool(tool.name, kwargs)
        return result.data
    tool_func.__doc__ = tool.description or tool.name  # 动态加 docstring
    return tool_func

async def get_Structured_tools(OBSIDIAN_MCP_IP="http://127.0.0.1:8000/sse"):
    tools_list = []
    client = Client(OBSIDIAN_MCP_IP)
    async with client:
        tools = await client.list_tools()
        for tool in tools:
            func = make_tool_func(client, tool)
            tools_list.append(Tool(
                func=func,
                name=tool.name,
                description=tool.description,
                args_schema=tool.inputSchema
            ))
    return tools_list

# Obsidian 工具定义
class ObsidianConfig:
    def __init__(self):
        self.api_key = os.getenv("OBSIDIAN_API_KEY", "629325f79464dc7c66fa2b2cc31e471f7f29e86b0f8e42c7aaf814bfb4e221e2")
        self.protocol = os.getenv("OBSIDIAN_PROTOCOL", "https")
        self.host = os.getenv("OBSIDIAN_HOST", "127.0.0.1")
        self.port = int(os.getenv("OBSIDIAN_PORT", "27124"))
        self.verify_ssl = os.getenv("OBSIDIAN_VERIFY_SSL", "false").lower() == "true"

# 初始化 Obsidian 实例
obsidian_config = ObsidianConfig()
obsidian_client = Obsidian(
    api_key=obsidian_config.api_key,
    protocol=obsidian_config.protocol,
    host=obsidian_config.host,
    port=obsidian_config.port,
    verify_ssl=obsidian_config.verify_ssl
)

# 工具输入模型
class ListFilesInput(BaseModel):
    dirpath: Optional[str] = Field(default="", description="目录路径，留空则列出根目录文件")

class GetFileInput(BaseModel):
    filepath: str = Field(description="文件路径")

class GetBatchFilesInput(BaseModel):
    filepaths: List[str] = Field(description="文件路径列表")

class SearchInput(BaseModel):
    query: str = Field(description="搜索查询")
    context_length: int = Field(default=100, description="上下文长度")

class AppendContentInput(BaseModel):
    filepath: str = Field(description="文件路径")
    content: str = Field(description="要追加的内容")

class PutContentInput(BaseModel):
    filepath: str = Field(description="文件路径")
    content: str = Field(description="要写入的内容")

class DeleteFileInput(BaseModel):
    filepath: str = Field(description="要删除的文件路径")

class SearchJsonInput(BaseModel):
    query: dict = Field(description="JSON查询对象")

class GetPeriodicNoteInput(BaseModel):
    period: str = Field(description="周期类型：daily, weekly, monthly, quarterly, yearly")
    type: str = Field(default="content", description="返回类型：content 或 metadata")

class GetRecentPeriodicNotesInput(BaseModel):
    period: str = Field(description="周期类型：daily, weekly, monthly, quarterly, yearly")
    limit: int = Field(default=5, description="返回数量限制")
    include_content: bool = Field(default=False, description="是否包含内容")

class GetRecentChangesInput(BaseModel):
    limit: int = Field(default=10, description="返回数量限制")
    days: int = Field(default=90, description="天数限制")

# MarkItDown 工具输入模型
class ConvertFileToMarkdownInput(BaseModel):
    filepath: str = Field(description="要转换的文件路径")
    save_to_obsidian: bool = Field(default=False, description="是否将转换结果保存到Obsidian")
    output_filename: Optional[str] = Field(default=None, description="输出文件名（如果保存到Obsidian）")

class ConvertUrlToMarkdownInput(BaseModel):
    url: str = Field(description="要转换的URL地址")
    save_to_obsidian: bool = Field(default=False, description="是否将转换结果保存到Obsidian")
    output_filename: Optional[str] = Field(default=None, description="输出文件名（如果保存到Obsidian）")

# Obsidian 工具函数
def list_files_in_vault(dirpath: str = "") -> str:
    """列出 Obsidian 保险库中的文件"""
    try:
        if dirpath:
            files = obsidian_client.list_files_in_dir(dirpath)
        else:
            files = obsidian_client.list_files_in_vault()
        return f"文件列表：{files}"
    except Exception as e:
        return f"获取文件列表失败：{str(e)}"

def get_file_contents(filepath: str) -> str:
    """获取指定文件的内容"""
    try:
        content = obsidian_client.get_file_contents(filepath)
        return f"文件 {filepath} 的内容：\n{content}"
    except Exception as e:
        return f"获取文件内容失败：{str(e)}"

def get_batch_file_contents(filepaths: List[str]) -> str:
    """获取多个文件的内容"""
    try:
        content = obsidian_client.get_batch_file_contents(filepaths)
        return f"批量文件内容：\n{content}"
    except Exception as e:
        return f"获取批量文件内容失败：{str(e)}"

def search_files(query: str, context_length: int = 100) -> str:
    """搜索文件"""
    try:
        results = obsidian_client.search(query, context_length)
        return f"搜索结果：{results}"
    except Exception as e:
        return f"搜索失败：{str(e)}"

def append_content(filepath: str, content: str) -> str:
    """向文件追加内容"""
    try:
        obsidian_client.append_content(filepath, content)
        return f"成功向文件 {filepath} 追加内容"
    except Exception as e:
        return f"追加内容失败：{str(e)}"

def put_content(filepath: str, content: str) -> str:
    """写入文件内容（覆盖）"""
    try:
        obsidian_client.put_content(filepath, content)
        return f"成功写入文件 {filepath}"
    except Exception as e:
        return f"写入文件失败：{str(e)}"

def delete_file(filepath: str) -> str:
    """删除文件"""
    try:
        obsidian_client.delete_file(filepath)
        return f"成功删除文件 {filepath}"
    except Exception as e:
        return f"删除文件失败：{str(e)}"

def search_json(query: dict) -> str:
    """使用JSON查询搜索"""
    try:
        results = obsidian_client.search_json(query)
        return f"JSON搜索结果：{results}"
    except Exception as e:
        return f"JSON搜索失败：{str(e)}"

def get_periodic_note(period: str, type: str = "content") -> str:
    """获取周期性笔记"""
    try:
        content = obsidian_client.get_periodic_note(period, type)
        return f"周期性笔记 ({period}, {type})：\n{content}"
    except Exception as e:
        return f"获取周期性笔记失败：{str(e)}"

def get_recent_periodic_notes(period: str, limit: int = 5, include_content: bool = False) -> str:
    """获取最近的周期性笔记"""
    try:
        notes = obsidian_client.get_recent_periodic_notes(period, limit, include_content)
        return f"最近的周期性笔记 ({period})：{notes}"
    except Exception as e:
        return f"获取最近周期性笔记失败：{str(e)}"

def get_recent_changes(limit: int = 10, days: int = 90) -> str:
    """获取最近的更改"""
    try:
        changes = obsidian_client.get_recent_changes(limit, days)
        return f"最近的更改：{changes}"
    except Exception as e:
        return f"获取最近更改失败：{str(e)}"

# MarkItDown 工具函数 <mcreference link="https://github.com/microsoft/markitdown" index="1">1</mcreference>
def convert_file_to_markdown(filepath: str, save_to_obsidian: bool = False, output_filename: Optional[str] = None) -> str:
    """将文件转换为Markdown格式"""
    if not MARKITDOWN_AVAILABLE:
        return "错误：markitdown 库未安装，无法使用文档转换功能"
    
    try:
        # 检查文件是否存在
        if not os.path.exists(filepath):
            return f"错误：文件 {filepath} 不存在"
        
        # 初始化 MarkItDown <mcreference link="https://dev.to/leapcell/deep-dive-into-microsoft-markitdown-4if5" index="3">3</mcreference>
        md = MarkItDown()
        
        # 转换文件
        result = md.convert(filepath)
        markdown_content = result.text_content
        
        if save_to_obsidian:
            # 生成输出文件名
            if not output_filename:
                base_name = os.path.splitext(os.path.basename(filepath))[0]
                output_filename = f"{base_name}_converted.md"
            
            # 确保文件名以.md结尾
            if not output_filename.endswith('.md'):
                output_filename += '.md'
            
            # 保存到 Obsidian
            try:
                obsidian_client.put_content(output_filename, markdown_content)
                return f"文件 {filepath} 已成功转换为Markdown并保存到 {output_filename}\n\n转换内容预览：\n{markdown_content[:500]}..."
            except Exception as e:
                return f"文件转换成功，但保存到Obsidian失败：{str(e)}\n\n转换内容：\n{markdown_content}"
        else:
            return f"文件 {filepath} 转换结果：\n\n{markdown_content}"
            
    except Exception as e:
        return f"转换文件失败：{str(e)}"

def convert_url_to_markdown(url: str, save_to_obsidian: bool = False, output_filename: Optional[str] = None) -> str:
    """将URL内容转换为Markdown格式"""
    if not MARKITDOWN_AVAILABLE:
        return "错误：markitdown 库未安装，无法使用文档转换功能"
    
    try:
        # 初始化 MarkItDown <mcreference link="https://dev.to/leapcell/deep-dive-into-microsoft-markitdown-4if5" index="3">3</mcreference>
        md = MarkItDown()
        
        # 转换URL
        result = md.convert(url)
        markdown_content = result.text_content
        
        if save_to_obsidian:
            # 生成输出文件名
            if not output_filename:
                # 从URL生成文件名
                from urllib.parse import urlparse
                parsed_url = urlparse(url)
                domain = parsed_url.netloc.replace('.', '_')
                path = parsed_url.path.replace('/', '_').replace('.', '_')
                output_filename = f"{domain}{path}_converted.md"
            
            # 确保文件名以.md结尾
            if not output_filename.endswith('.md'):
                output_filename += '.md'
            
            # 保存到 Obsidian
            try:
                obsidian_client.put_content(output_filename, markdown_content)
                return f"URL {url} 已成功转换为Markdown并保存到 {output_filename}\n\n转换内容预览：\n{markdown_content[:500]}..."
            except Exception as e:
                return f"URL转换成功，但保存到Obsidian失败：{str(e)}\n\n转换内容：\n{markdown_content}"
        else:
            return f"URL {url} 转换结果：\n\n{markdown_content}"
            
    except Exception as e:
        return f"转换URL失败：{str(e)}"

# 新增工具输入模型
class CreateFolderInput(BaseModel):
    folder_path: str = Field(description="要创建的文件夹路径")

class DeleteFolderInput(BaseModel):
    folder_path: str = Field(description="要删除的文件夹路径")

class InsertLineInput(BaseModel):
    filepath: str = Field(description="文件路径")
    line_number: int = Field(description="行号（从1开始）")
    content: str = Field(description="要插入的内容")

class DeleteLineInput(BaseModel):
    filepath: str = Field(description="文件路径")
    line_number: int = Field(description="要删除的行号（从1开始）")

# 新增工具函数
def create_folder(folder_path: str) -> str:
    """创建文件夹"""
    try:
        obsidian_client.create_folder(folder_path)
        return f"成功创建文件夹：{folder_path}"
    except Exception as e:
        return f"创建文件夹失败：{str(e)}"

def delete_folder(folder_path: str) -> str:
    """删除文件夹"""
    try:
        obsidian_client.delete_folder(folder_path)
        return f"成功删除文件夹：{folder_path}"
    except Exception as e:
        return f"删除文件夹失败：{str(e)}"

def insert_line_at_position(filepath: str, line_number: int, content: str) -> str:
    """在指定行号插入内容"""
    try:
        obsidian_client.patch_content_at_line(filepath, line_number, content, "insert")
        return f"成功在文件 {filepath} 的第 {line_number} 行插入内容"
    except Exception as e:
        return f"插入内容失败：{str(e)}"

def delete_line_at_position(filepath: str, line_number: int) -> str:
    """删除指定行号的内容"""
    try:
        obsidian_client.patch_content_at_line(filepath, line_number, "", "delete")
        return f"成功删除文件 {filepath} 的第 {line_number} 行"
    except Exception as e:
        return f"删除行失败：{str(e)}"

def get_obsidian_tools():
    """获取所有 Obsidian 工具"""
    tools = [
        StructuredTool.from_function(
            name="list_files_in_vault",
            description="列出 Obsidian 保险库中的文件，可以指定目录路径",
            func=list_files_in_vault,
            args_schema=ListFilesInput
        ),
        StructuredTool.from_function(
            name="get_file_contents",
            description="获取指定文件的内容",
            func=get_file_contents,
            args_schema=GetFileInput
        ),
        StructuredTool.from_function(
            name="get_batch_file_contents",
            description="获取多个文件的内容",
            func=get_batch_file_contents,
            args_schema=GetBatchFilesInput
        ),
        StructuredTool.from_function(
            name="search_files",
            description="在 Obsidian 中搜索文件",
            func=search_files,
            args_schema=SearchInput
        ),
        StructuredTool.from_function(
            name="append_content",
            description="向文件追加内容",
            func=append_content,
            args_schema=AppendContentInput
        ),
        StructuredTool.from_function(
            name="put_content",
            description="写入文件内容（覆盖原内容）",
            func=put_content,
            args_schema=PutContentInput
        ),
        StructuredTool.from_function(
            name="delete_file",
            description="删除文件",
            func=delete_file,
            args_schema=DeleteFileInput
        ),
        StructuredTool.from_function(
            name="search_json",
            description="使用JSON查询搜索文件",
            func=search_json,
            args_schema=SearchJsonInput
        ),
        StructuredTool.from_function(
            name="get_periodic_note",
            description="获取周期性笔记（日、周、月、季、年）",
            func=get_periodic_note,
            args_schema=GetPeriodicNoteInput
        ),
        StructuredTool.from_function(
            name="get_recent_periodic_notes",
            description="获取最近的周期性笔记",
            func=get_recent_periodic_notes,
            args_schema=GetRecentPeriodicNotesInput
        ),
        StructuredTool.from_function(
            name="get_recent_changes",
            description="获取最近的更改",
            func=get_recent_changes,
            args_schema=GetRecentChangesInput
        ),
        StructuredTool.from_function(
            name="create_folder",
            description="创建文件夹",
            func=create_folder,
            args_schema=CreateFolderInput
        ),
        StructuredTool.from_function(
            name="delete_folder",
            description="删除文件夹",
            func=delete_folder,
            args_schema=DeleteFolderInput
        ),
        StructuredTool.from_function(
            name="insert_line_at_position",
            description="在指定行号插入内容",
            func=insert_line_at_position,
            args_schema=InsertLineInput
        ),
        StructuredTool.from_function(
            name="delete_line_at_position",
            description="删除指定行号的内容",
            func=delete_line_at_position,
            args_schema=DeleteLineInput
        )
    ]
    
    # 添加 MarkItDown 工具（如果可用）
    if MARKITDOWN_AVAILABLE:
        markitdown_tools = [
            StructuredTool.from_function(
                name="convert_file_to_markdown",
                description="将各种格式的文件（PDF、Word、Excel、PowerPoint、图片、音频等）转换为Markdown格式，支持保存到Obsidian",
                func=convert_file_to_markdown,
                args_schema=ConvertFileToMarkdownInput
            ),
            StructuredTool.from_function(
                name="convert_url_to_markdown",
                description="将网页URL内容转换为Markdown格式，支持保存到Obsidian",
                func=convert_url_to_markdown,
                args_schema=ConvertUrlToMarkdownInput
            )
        ]
        tools.extend(markitdown_tools)
    
    return tools