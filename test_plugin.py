#!/usr/bin/env python3
"""
测试Obsidian Agent插件的API功能
"""

import requests
import json
import time

# API服务器配置
API_URL = "http://127.0.0.1:8001"
API_KEY = "your-api-key-here"  # 如果需要的话

def test_health():
    """测试健康检查端点"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查成功: {data}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
        return False

def test_configure_llm():
    """测试LLM配置端点"""
    print("\n🔧 测试LLM配置...")
    config = {
        "provider": "ollama",
        "model": "qwen3:1.7b",
        "api_key": "",
        "api_base": "http://localhost:11434"
    }
    
    try:
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
            
        response = requests.post(f"{API_URL}/configure-llm", 
                               json=config, 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ LLM配置成功: {data}")
            return True
        else:
            print(f"❌ LLM配置失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ LLM配置异常: {e}")
        return False

def test_chat():
    """测试聊天端点"""
    print("\n💬 测试聊天功能...")
    message = {
        "message": "你好，请简单介绍一下你自己。",
        "conversation_id": None
    }
    
    try:
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
            
        response = requests.post(f"{API_URL}/chat", 
                               json=message, 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 聊天成功:")
            print(f"   响应: {data.get('response', '无响应')}")
            print(f"   对话ID: {data.get('conversation_id', '无ID')}")
            return True
        else:
            print(f"❌ 聊天失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 聊天异常: {e}")
        return False

def test_obsidian_tools():
    """测试Obsidian工具功能"""
    print("\n🛠️ 测试Obsidian工具...")
    message = {
        "message": "请帮我创建一个名为'测试笔记.md'的新笔记，内容是'这是一个测试笔记'。",
        "conversation_id": None
    }
    
    try:
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
            
        response = requests.post(f"{API_URL}/chat", 
                               json=message, 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Obsidian工具测试成功:")
            print(f"   响应: {data.get('response', '无响应')}")
            return True
        else:
            print(f"❌ Obsidian工具测试失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Obsidian工具测试异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试Obsidian Agent插件...")
    print("=" * 50)
    
    # 测试健康检查
    if not test_health():
        print("❌ 健康检查失败，停止测试")
        return
    
    # 等待一下
    time.sleep(1)
    
    # 测试LLM配置
    if not test_configure_llm():
        print("❌ LLM配置失败，但继续测试其他功能")
    
    # 等待一下
    time.sleep(2)
    
    # 测试聊天功能
    if not test_chat():
        print("❌ 聊天功能失败")
    
    # 等待一下
    time.sleep(2)
    
    # 测试Obsidian工具
    if not test_obsidian_tools():
        print("❌ Obsidian工具失败")
    
    print("\n" + "=" * 50)
    print("🎉 测试完成！")

if __name__ == "__main__":
    main()