# === main.py ===
from dotenv import load_dotenv
import os
load_dotenv()

import asyncio
import requests
from langchain.agents import initialize_agent, AgentType
from langchain.tools import StructuredTool
from langchain_community.chat_models import ChatOpenAI
from pydantic import BaseModel
from langchain.agents import initialize_agent, AgentType
from tools import get_Structured_tools  # 这里不变，仍然用你的封装
from langchain_google_genai import ChatGoogleGenerativeAI

OBSIDIAN_MCP_IP = os.getenv("OBSIDIAN_MCP_IP")

##########################################
# 1) 异步获取你的 MCP 工具列表
##########################################
async def get_tool():
    tool_list = await get_Structured_tools(OBSIDIAN_MCP_IP)
    return tool_list


##########################################
# 2) 初始化 Gemini LLM
##########################################
def get_agent(tool_list):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-pro-exp",  # 或 "gemini-1.5-pro-latest" 
    )
    agent = initialize_agent(
        tools=tool_list,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,  # Gemini 也支持 function calling 风格
        verbose=True
    )
    return agent


##########################################
# 3) 运行示例
##########################################
if __name__ == "__main__":
    tool_list = asyncio.run(get_tool())

    question = "请在审稿意见回复的文件中加上一行3.写入今天的日期。"

    agent = get_agent(tool_list)
    print("\n=== 最终回答 ===")
    result = agent.invoke({"input": question})
    print(result)
    print("**********")
