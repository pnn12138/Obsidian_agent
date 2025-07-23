#!/usr/bin/env python3
"""
Obsidian Agent Chat 插件演示脚本
展示插件的主要功能和API调用
"""

import requests
import json
import time
import sys

# API配置
API_URL = "http://127.0.0.1:8001"

def print_header(title):
    """打印标题"""
    print("\n" + "="*60)
    print(f"🎯 {title}")
    print("="*60)

def print_step(step, description):
    """打印步骤"""
    print(f"\n📍 步骤 {step}: {description}")
    print("-" * 40)

def demo_health_check():
    """演示健康检查"""
    print_step(1, "健康检查")
    
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ API服务器运行正常")
            print(f"   状态: {data.get('status')}")
            print(f"   Agent初始化: {data.get('agent_initialized')}")
            print(f"   版本: {data.get('version')}")
            
            config = data.get('current_config', {})
            if config:
                print(f"   LLM提供商: {config.get('provider')}")
                print(f"   模型: {config.get('model')}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False

def demo_llm_config():
    """演示LLM配置"""
    print_step(2, "LLM配置")
    
    config = {
        "provider": "ollama",
        "model": "qwen3:1.7b",
        "api_key": "",
        "api_base": "http://localhost:11434"
    }
    
    print(f"📝 配置LLM:")
    print(f"   提供商: {config['provider']}")
    print(f"   模型: {config['model']}")
    print(f"   API基础地址: {config['api_base']}")
    
    try:
        response = requests.post(f"{API_URL}/configure-llm", json=config)
        if response.status_code == 200:
            data = response.json()
            print("✅ LLM配置成功")
            print(f"   消息: {data.get('message')}")
            return True
        else:
            print(f"❌ LLM配置失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 配置异常: {e}")
        return False

def demo_basic_chat():
    """演示基本聊天功能"""
    print_step(3, "基本聊天功能")
    
    messages = [
        "你好，请简单介绍一下你自己。",
        "你能帮我做什么？",
        "请列出你支持的主要功能。"
    ]
    
    conversation_id = None
    
    for i, message in enumerate(messages, 1):
        print(f"\n💬 消息 {i}: {message}")
        
        try:
            response = requests.post(f"{API_URL}/chat", json={
                "message": message,
                "conversation_id": conversation_id
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"🤖 回复: {data.get('response', '无回复')}")
                conversation_id = data.get('conversation_id')
                time.sleep(1)  # 避免请求过快
            else:
                print(f"❌ 聊天失败: {response.status_code}")
                break
        except Exception as e:
            print(f"❌ 聊天异常: {e}")
            break

def demo_obsidian_tools():
    """演示Obsidian工具功能"""
    print_step(4, "Obsidian工具功能")
    
    tool_demos = [
        {
            "description": "创建笔记",
            "message": "请帮我创建一个名为'演示笔记.md'的新笔记，内容是'这是一个演示笔记，用于测试Obsidian Agent插件的功能。'"
        },
        {
            "description": "搜索文件",
            "message": "请搜索所有包含'演示'的笔记文件。"
        },
        {
            "description": "列出文件",
            "message": "请列出当前笔记库中的所有markdown文件。"
        }
    ]
    
    for demo in tool_demos:
        print(f"\n🛠️ 工具演示: {demo['description']}")
        print(f"📝 指令: {demo['message']}")
        
        try:
            response = requests.post(f"{API_URL}/chat", json={
                "message": demo['message'],
                "conversation_id": None
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"🤖 结果: {data.get('response', '无结果')}")
                time.sleep(2)  # 给工具执行一些时间
            else:
                print(f"❌ 工具执行失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 工具执行异常: {e}")

def demo_file_operations():
    """演示文件操作功能"""
    print_step(5, "文件操作功能")
    
    operations = [
        {
            "description": "读取文件内容",
            "message": "请读取'演示笔记.md'文件的内容。"
        },
        {
            "description": "更新文件内容",
            "message": "请在'演示笔记.md'文件中添加一行：'这是通过Agent添加的内容。'"
        },
        {
            "description": "获取文件信息",
            "message": "请告诉我'演示笔记.md'文件的详细信息。"
        }
    ]
    
    for operation in operations:
        print(f"\n📁 文件操作: {operation['description']}")
        print(f"📝 指令: {operation['message']}")
        
        try:
            response = requests.post(f"{API_URL}/chat", json={
                "message": operation['message'],
                "conversation_id": None
            })
            
            if response.status_code == 200:
                data = response.json()
                print(f"🤖 结果: {data.get('response', '无结果')}")
                time.sleep(1)
            else:
                print(f"❌ 操作失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 操作异常: {e}")

def main():
    """主演示函数"""
    print_header("Obsidian Agent Chat 插件功能演示")
    
    print("🚀 欢迎使用 Obsidian Agent Chat 插件演示！")
    print("📋 本演示将展示插件的主要功能：")
    print("   1. 健康检查")
    print("   2. LLM配置")
    print("   3. 基本聊天")
    print("   4. Obsidian工具")
    print("   5. 文件操作")
    
    # 检查API服务器是否运行
    if not demo_health_check():
        print("\n❌ API服务器未运行，请先启动服务器：")
        print("   Windows: start_agent.bat")
        print("   Linux/Mac: ./start_agent.sh")
        sys.exit(1)
    
    # 配置LLM
    if not demo_llm_config():
        print("\n⚠️ LLM配置失败，但继续演示其他功能...")
    
    # 基本聊天演示
    demo_basic_chat()
    
    # Obsidian工具演示
    demo_obsidian_tools()
    
    # 文件操作演示
    demo_file_operations()
    
    print_header("演示完成")
    print("🎉 恭喜！你已经体验了 Obsidian Agent Chat 插件的主要功能。")
    print("\n📚 更多信息：")
    print("   - 完整使用指南: USER_GUIDE.md")
    print("   - 快速开始: GETTING_STARTED.md")
    print("   - 项目主页: README.md")
    print("\n💡 提示：")
    print("   - 在Obsidian中启用插件后，点击侧边栏的机器人图标开始使用")
    print("   - 右键菜单提供了快速访问功能")
    print("   - 支持拖拽文件到聊天界面")
    print("\n🚀 开始你的智能笔记之旅吧！")

if __name__ == "__main__":
    main()