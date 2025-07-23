from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import uvicorn
from dotenv import load_dotenv
import os

# 导入现有的 Agent 代码
from qwen_agen import get_agent, get_obsidian_tools
from langchain.tools import Tool

load_dotenv()

app = FastAPI(title="Obsidian Agent API", version="1.0.0")

# 添加 CORS 中间件，允许 Obsidian 插件访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求模型
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    status: str = "success"

# 全局变量存储 Agent 实例
agent_instance = None
conversation_history = {}

def initialize_agent():
    """初始化 Agent 实例"""
    global agent_instance
    try:
        # 获取 Obsidian 工具并转换为单输入工具
        obsidian_tools = get_obsidian_tools()
        
        # 将 StructuredTool 转换为单输入的 Tool
        simple_tools = []
        for tool in obsidian_tools:
            # 创建包装函数来处理单输入
            def create_wrapper(tool_func):
                def wrapper(input_str):
                    try:
                        # 对于没有参数的工具
                        if tool_func.__name__ == 'list_files_in_vault':
                            return tool_func("")
                        # 对于有参数的工具，尝试解析输入
                        elif '|' in input_str:
                            parts = input_str.split('|')
                            if len(parts) == 2:
                                return tool_func(parts[0].strip(), parts[1].strip())
                            else:
                                return tool_func(input_str.strip())
                        else:
                            return tool_func(input_str.strip())
                    except Exception as e:
                        return f"工具调用失败: {str(e)}"
                return wrapper
            
            simple_tool = Tool(
                name=tool.name,
                description=tool.description,
                func=create_wrapper(tool.func)
            )
            simple_tools.append(simple_tool)
        
        # 添加一个简单的天气工具作为示例
        def get_weather(city: str) -> str:
            """获取指定城市的天气信息"""
            return f"当前 {city} 的天气是晴天，气温 25°C。"

        weather_tool = Tool(
            name="get_weather",
            description="获取指定城市的天气信息，当用户询问天气时调用此工具。输入参数是城市名称。",
            func=lambda input_str: get_weather(input_str.strip())
        )

        # 合并所有工具
        tool_list = simple_tools + [weather_tool]
        
        # 初始化 Agent
        agent_instance = get_agent(tool_list)
        print("Agent 初始化成功")
        return True
    except Exception as e:
        print(f"Agent 初始化失败: {str(e)}")
        return False

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化 Agent"""
    success = initialize_agent()
    if not success:
        print("警告: Agent 初始化失败，某些功能可能不可用")

@app.get("/")
async def root():
    """健康检查端点"""
    return {"message": "Obsidian Agent API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """详细的健康检查"""
    return {
        "status": "healthy",
        "agent_initialized": agent_instance is not None,
        "version": "1.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """与 Agent 聊天的主要端点"""
    global agent_instance, conversation_history
    
    if agent_instance is None:
        raise HTTPException(status_code=500, detail="Agent 未初始化")
    
    try:
        # 生成或使用现有的对话 ID
        conv_id = request.conversation_id or f"conv_{len(conversation_history)}"
        
        # 获取对话历史
        if conv_id not in conversation_history:
            conversation_history[conv_id] = []
        
        # 调用 Agent
        result = agent_instance.invoke({"input": request.message})
        
        # 提取响应文本
        response_text = result.get("output", str(result))
        
        # 保存对话历史
        conversation_history[conv_id].append({
            "user": request.message,
            "agent": response_text
        })
        
        return ChatResponse(
            response=response_text,
            conversation_id=conv_id,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理请求时出错: {str(e)}")

@app.get("/conversations/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    """获取对话历史"""
    if conversation_id not in conversation_history:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return {
        "conversation_id": conversation_id,
        "history": conversation_history[conversation_id]
    }

@app.get("/conversations")
async def list_conversations():
    """列出所有对话"""
    return {
        "conversations": list(conversation_history.keys()),
        "total": len(conversation_history)
    }

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除对话历史"""
    if conversation_id not in conversation_history:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    del conversation_history[conversation_id]
    return {"message": f"对话 {conversation_id} 已删除"}

@app.post("/agent/reload")
async def reload_agent():
    """重新加载 Agent"""
    success = initialize_agent()
    if success:
        return {"message": "Agent 重新加载成功", "status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Agent 重新加载失败")

@app.post("/test-llm")
async def test_llm_connection(request: dict):
    """Test LLM connection with provided configuration"""
    try:
        provider = request.get("provider", "ollama")
        model = request.get("model", "qwen2.5:7b")
        api_key = request.get("api_key", "")
        api_base = request.get("api_base", "")
        
        # Test the LLM connection by creating a simple chat
        if provider == "ollama":
            from langchain_ollama import ChatOllama
            llm = ChatOllama(model=model, base_url=api_base or "http://localhost:11434")
        elif provider == "openai":
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=model, api_key=api_key, base_url=api_base)
        elif provider == "deepseek":
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=api_base or "https://api.deepseek.com"
            )
        elif provider == "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
        elif provider == "qwen":
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=api_base or "https://dashscope.aliyuncs.com/compatible-mode/v1"
            )
        else:
            return {"success": False, "error": f"Unsupported provider: {provider}"}
        
        # Test with a simple message
        from langchain_core.messages import HumanMessage
        test_message = HumanMessage(content="Hello, this is a connection test.")
        response = await llm.ainvoke([test_message])
        
        return {"success": True, "message": "LLM connection successful"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/reload-agent")
async def reload_agent_endpoint(request: dict):
    """Reload agent with new LLM configuration"""
    global agent_executor
    try:
        provider = request.get("provider", "ollama")
        model = request.get("model", "qwen2.5:7b")
        api_key = request.get("api_key", "")
        api_base = request.get("api_base", "")
        hybrid_mode = request.get("hybrid_mode", False)
        
        # Reinitialize the agent with new configuration
        agent_executor = await initialize_agent(provider, model, api_key, api_base, hybrid_mode)
        
        return {"success": True, "message": "Agent reloaded successfully"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # 从环境变量获取配置
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8001"))
    
    print(f"启动 Obsidian Agent API 服务器...")
    print(f"地址: http://{host}:{port}")
    print(f"文档: http://{host}:{port}/docs")
    
    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )