from dotenv import load_dotenv
import os
load_dotenv()

# 导入各种LLM
from langchain_ollama import ChatOllama
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from pydantic import BaseModel, Field
import requests
from tools import get_obsidian_tools, get_Structured_tools
import asyncio

OBSIDIAN_MCP_IP = os.getenv("OBSIDIAN_MCP_IP", "http://127.0.0.1:8000/sse")

##########################################
# 3) 用 StructuredTool 包装 MCP 功能
##########################################
async def get_tool():
    tool_list = await get_Structured_tools(OBSIDIAN_MCP_IP)
    # 这里可以继续用 tool_list 初始化 agent 或其他操作
    return tool_list

##########################################
# 4) 初始化 LLM（支持多种提供商）
##########################################

def get_llm(provider: str, model: str, api_key: str = "", api_base: str = ""):
    """根据配置获取LLM实例"""
    if provider == "ollama":
        return ChatOllama(
            model=model,
            base_url=api_base or "http://localhost:11434",
            temperature=0,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=api_base or "https://api.openai.com/v1",
            temperature=0,
        )
    elif provider == "deepseek":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=api_base or "https://api.deepseek.com",
            temperature=0,
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0,
        )
    elif provider == "qwen":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=api_base or "https://dashscope.aliyuncs.com/compatible-mode/v1",
            temperature=0,
        )
    else:
        raise ValueError(f"不支持的LLM提供商: {provider}")

def get_agent(tool_list):
    """使用默认Ollama配置初始化Agent（保持向后兼容）"""
    ollama_llm = ChatOllama(
        model="qwen3:1.7b",
        base_url="http://localhost:11434",
        temperature=0,
    )

    # 使用 ZERO_SHOT_REACT_DESCRIPTION 类型，这是最稳定的类型
    agent = initialize_agent(
        tools=tool_list,    # 一定要是列表
        llm=ollama_llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=4
    )
    return agent

def get_agent_with_config(tool_list, llm_config):
    """使用指定配置初始化Agent"""
    llm = get_llm(
        provider=llm_config.provider,
        model=llm_config.model,
        api_key=llm_config.api_key,
        api_base=llm_config.api_base
    )

    # 使用 ZERO_SHOT_REACT_DESCRIPTION 类型，这是最稳定的类型
    agent = initialize_agent(
        tools=tool_list,    # 一定要是列表
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=4
    )
    return agent

##########################################
# 5) 初始化 Agent（支持 Function Calling）
##########################################

##########################################
# 6) 测试调用
##########################################

if __name__ == "__main__":
    # 获取 Obsidian 工具并转换为单输入工具
    obsidian_tools = get_obsidian_tools()
    
    # 将 StructuredTool 转换为单输入的 Tool
    simple_tools = []
    for tool in obsidian_tools:
        # 创建包装函数来处理单输入
        def create_wrapper(tool_func):
            def wrapper(input_str):
                # 这里需要根据工具的具体参数来解析输入
                # 简化处理：直接调用工具函数
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
        print(f"正在查询 {city} 的天气...")
        return f"当前 {city} 的天气是雨天，气温 125°C。"

    weather_tool = Tool(
        name="get_weather",
        description="获取指定城市的天气信息，当用户询问天气时调用此工具。输入参数是城市名称。",
        func=lambda input_str: get_weather(input_str.strip())
    )

    # 合并所有工具
    tool_list = simple_tools + [weather_tool]

    #tool_list = asyncio.run(get_tool()) 
   
    question = "帮我删掉审稿意见回复这个文件"
    agent = get_agent(tool_list)
    print("\n=== 最终回答 ===")
    result = agent.invoke({"input": question})
    print(result)
    print("**********")
    
