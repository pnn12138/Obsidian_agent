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

# 2) 使用 SSE 从 MCP 获取工具列表

from langchain.tools import StructuredTool


# 假设你的 MCP 服务在本地 8000 端口
# client = Client("http://127.0.0.1:8000") # This line is removed as per the new_code

async def main():
    client = Client("http://127.0.0.1:8000/sse")
    async with client:
        tools = await client.list_tools()
        # tools -> list[mcp.types.Tool]
        
        for tool in tools:
            
            print(f"Tool: {tool.name}")
            print(f"Description: {tool.description}")
            if tool.inputSchema:
                print(f"Parameters: {tool.inputSchema}")
async def test():
    client = Client("http://127.0.0.1:8000/sse")
    async with client:
    # Simple tool call
        result = await client.call_tool("list_files")
        # result -> CallToolResult with structured and unstructured data
        
        # Access structured data (automatically deserialized)
        print(result.data)  # 8 (int) or {"result": 8} for primitive types
        
        # Access traditional content blocks  
        print(result.content[0].text)  # "8" (TextContent)
if __name__ == "__main__":
    asyncio.run(main())
