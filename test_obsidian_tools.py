#!/usr/bin/env python3
"""
测试 Obsidian 工具是否能正常工作
"""

import os
import sys
from dotenv import load_dotenv

# 添加路径
sys.path.append('src')
sys.path.append('../obsidian_fastmcp/src')

load_dotenv()

def test_obsidian_tools():
    """测试 Obsidian 工具"""
    try:
        from tools import get_obsidian_tools
        
        print("正在获取 Obsidian 工具...")
        tools = get_obsidian_tools()
        
        print(f"成功获取 {len(tools)} 个 Obsidian 工具：")
        for i, tool in enumerate(tools, 1):
            print(f"{i}. {tool.name}: {tool.description}")
        
        # 测试第一个工具
        if tools:
            print(f"\n测试工具: {tools[0].name}")
            try:
                result = tools[0].func()
                print(f"工具调用结果: {result}")
            except Exception as e:
                print(f"工具调用失败: {e}")
        
        return True
        
    except Exception as e:
        print(f"获取 Obsidian 工具失败: {e}")
        return False

def test_obsidian_connection():
    """测试 Obsidian 连接"""
    try:
        from obsidian import Obsidian
        
        # 从环境变量获取配置
        api_key = os.getenv("OBSIDIAN_API_KEY", "your-api-key")
        protocol = os.getenv("OBSIDIAN_PROTOCOL", "https")
        host = os.getenv("OBSIDIAN_HOST", "127.0.0.1")
        port = int(os.getenv("OBSIDIAN_PORT", "27124"))
        verify_ssl = os.getenv("OBSIDIAN_VERIFY_SSL", "false").lower() == "true"
        
        print(f"连接配置: {protocol}://{host}:{port}")
        print(f"API Key: {api_key[:10]}..." if len(api_key) > 10 else f"API Key: {api_key}")
        
        obsidian = Obsidian(
            api_key=api_key,
            protocol=protocol,
            host=host,
            port=port,
            verify_ssl=verify_ssl
        )
        
        # 测试连接
        files = obsidian.list_files_in_vault()
        print(f"连接成功！找到 {len(files) if files else 0} 个文件")
        return True
        
    except Exception as e:
        print(f"连接 Obsidian 失败: {e}")
        return False

if __name__ == "__main__":
    print("=== 测试 Obsidian 工具 ===\n")
    
    # 测试连接
    print("1. 测试 Obsidian 连接...")
    connection_ok = test_obsidian_connection()
    
    print("\n2. 测试 Obsidian 工具...")
    tools_ok = test_obsidian_tools()
    
    if connection_ok and tools_ok:
        print("\n✅ 所有测试通过！")
    else:
        print("\n❌ 测试失败，请检查配置和连接。") 