import requests
import json

def test_ollama_api():
    """测试 Ollama API 连接"""
    try:
        # 测试 Ollama API 是否可访问
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            models = response.json()
            print("✅ Ollama API 连接成功！")
            print("可用模型:")
            for model in models.get("models", []):
                print(f"  - {model.get('name', 'Unknown')}")
            
            # 检查是否有 qwen:0.5b-chat 模型
            qwen_model = None
            for model in models.get("models", []):
                if "qwen:0.5b-chat" in model.get("name", ""):
                    qwen_model = model
                    break
            
            if qwen_model:
                print(f"✅ 找到 qwen:0.5b-chat 模型")
                return True
            else:
                print("❌ 未找到 qwen:0.5b-chat 模型")
                print("请运行: ollama pull qwen:0.5b-chat")
                return False
        else:
            print(f"❌ Ollama API 响应错误: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到 Ollama API")
        print("请确保 Ollama 服务正在运行")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    test_ollama_api() 