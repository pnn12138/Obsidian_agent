#!/usr/bin/env python3
"""
测试Markitdown API端点
"""

import requests
import json
import os

def test_convert_file():
    """测试文件转换功能"""
    
    # API服务器地址
    api_url = "http://127.0.0.1:8001"
    
    # 创建一个测试文件
    test_file_path = "test_document.txt"
    with open(test_file_path, 'w', encoding='utf-8') as f:
        f.write("""# 测试文档

这是一个测试文档，用于验证Markitdown转换功能。

## 功能特性

- 支持多种文件格式
- 转换为Markdown或纯文本
- 可以保存到指定路径

**重要提示**: 这只是一个测试文件。
""")
    
    try:
        # 测试转换为Markdown
        print("测试转换为Markdown...")
        response = requests.post(f"{api_url}/convert-file", json={
            "file_path": os.path.abspath(test_file_path),
            "output_format": "markdown"
        })
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Markdown转换成功!")
            print(f"内容预览: {result['content'][:200]}...")
        else:
            print(f"❌ Markdown转换失败: {response.text}")
        
        # 测试转换为纯文本
        print("\n测试转换为纯文本...")
        response = requests.post(f"{api_url}/convert-file", json={
            "file_path": os.path.abspath(test_file_path),
            "output_format": "text"
        })
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 纯文本转换成功!")
            print(f"内容预览: {result['content'][:200]}...")
        else:
            print(f"❌ 纯文本转换失败: {response.text}")
        
        # 测试保存到文件
        print("\n测试保存到文件...")
        output_path = "converted_output.md"
        response = requests.post(f"{api_url}/convert-file", json={
            "file_path": os.path.abspath(test_file_path),
            "output_format": "markdown",
            "output_path": os.path.abspath(output_path)
        })
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 文件保存成功!")
            print(f"保存路径: {result['output_path']}")
            
            # 验证文件是否存在
            if os.path.exists(output_path):
                print("✅ 输出文件确实存在")
                with open(output_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    print(f"文件内容预览: {content[:200]}...")
            else:
                print("❌ 输出文件不存在")
        else:
            print(f"❌ 文件保存失败: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到API服务器，请确保服务器正在运行")
    except Exception as e:
        print(f"❌ 测试过程中出错: {str(e)}")
    finally:
        # 清理测试文件
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
        if os.path.exists("converted_output.md"):
            os.remove("converted_output.md")

if __name__ == "__main__":
    print("🧪 开始测试Markitdown API...")
    test_convert_file()
    print("\n🎉 测试完成!")