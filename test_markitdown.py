#!/usr/bin/env python3
"""
测试 markitdown 功能的脚本
"""

import sys
import os
sys.path.append('src')

from tools import convert_file_to_markdown, convert_url_to_markdown, MARKITDOWN_AVAILABLE

def test_markitdown():
    """测试 markitdown 功能"""
    print("=== MarkItDown 功能测试 ===")
    print(f"MarkItDown 可用性: {MARKITDOWN_AVAILABLE}")
    
    if not MARKITDOWN_AVAILABLE:
        print("❌ markitdown 库未安装，请运行: uv add 'markitdown[all]'")
        return
    
    print("✅ markitdown 库已安装")
    
    # 测试URL转换
    print("\n--- 测试URL转换 ---")
    test_url = "https://github.com/microsoft/markitdown"
    try:
        result = convert_url_to_markdown(test_url, save_to_obsidian=False)
        print(f"URL转换结果: {result[:200]}...")
        print("✅ URL转换测试成功")
    except Exception as e:
        print(f"❌ URL转换测试失败: {e}")
    
    # 测试文件转换（如果有测试文件）
    print("\n--- 测试文件转换 ---")
    # 创建一个简单的测试文件
    test_file = "test_document.txt"
    test_content = """# 测试文档

这是一个测试文档，用于验证 markitdown 功能。

## 功能特性

- 支持多种文件格式
- 转换为 Markdown
- 集成到 Obsidian

## 结论

markitdown 是一个强大的文档转换工具。
"""
    
    try:
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_content)
        
        result = convert_file_to_markdown(test_file, save_to_obsidian=False)
        print(f"文件转换结果: {result[:200]}...")
        print("✅ 文件转换测试成功")
        
        # 清理测试文件
        os.remove(test_file)
        
    except Exception as e:
        print(f"❌ 文件转换测试失败: {e}")
        # 尝试清理测试文件
        try:
            os.remove(test_file)
        except:
            pass

if __name__ == "__main__":
    test_markitdown()