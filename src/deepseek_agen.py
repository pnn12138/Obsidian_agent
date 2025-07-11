# === main.py ===
from dotenv import load_dotenv
import os
import asyncio
from langchain.agents import initialize_agent, AgentType
from langchain_community.chat_models import ChatOpenAI
from tools import get_Structured_tools  # 这里不变，仍然用你的封装

load_dotenv()
OBSIDIAN_MCP_IP = os.getenv("OBSIDIAN_MCP_IP")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")  # 你的 DeepSeek API 地址
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")  # 你的 DeepSeek API Key

async def get_tool():
    tool_list = await get_Structured_tools(OBSIDIAN_MCP_IP or "http://127.0.0.1:8000/sse")
    return tool_list

# DeepSeek LLM 初始化

def get_agent(tool_list):
    llm = ChatOpenAI(
        openai_api_base=DEEPSEEK_API_BASE,
        openai_api_key=DEEPSEEK_API_KEY,
        model="deepseek-chat",  # 或 deepseek-coder
    )
    agent = initialize_agent(
        tools=tool_list,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,
        verbose=True
    )
    return agent

if __name__ == "__main__":
    tool_list = asyncio.run(get_tool())
    question = "“Please use the tool list_files to get all files in the Obsidian vault. Do not answer directly"
    agent = get_agent(tool_list)
    print("\n=== 最终回答 ===")
    result = agent.invoke({"input": question})
    print(result)
    print("**********")
    print("Agent tools:", [t.name for t in agent.tools])
