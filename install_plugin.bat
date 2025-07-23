@echo off
echo 正在安装 Obsidian Agent Chat 插件...

REM 检查是否提供了保险库路径参数
if "%1"=="" (
    echo 使用方法: install_plugin.bat "C:\path\to\your\vault"
    echo 请提供你的 Obsidian 保险库路径
    pause
    exit /b 1
)

set VAULT_PATH=%1
set PLUGIN_DIR=%VAULT_PATH%\.obsidian\plugins\obsidian-agent-chat

echo 保险库路径: %VAULT_PATH%
echo 插件目录: %PLUGIN_DIR%

REM 检查保险库路径是否存在
if not exist "%VAULT_PATH%" (
    echo 错误: 保险库路径不存在: %VAULT_PATH%
    pause
    exit /b 1
)

REM 创建插件目录
if not exist "%PLUGIN_DIR%" (
    echo 创建插件目录...
    mkdir "%PLUGIN_DIR%"
)

REM 复制插件文件
echo 复制插件文件...
copy "main.js" "%PLUGIN_DIR%\main.js"
copy "manifest.json" "%PLUGIN_DIR%\manifest.json"
copy "styles.css" "%PLUGIN_DIR%\styles.css"

echo.
echo ✅ 插件安装完成！
echo.
echo 接下来的步骤:
echo 1. 重启 Obsidian
echo 2. 进入 设置 → 社区插件
echo 3. 关闭安全模式（如果尚未关闭）
echo 4. 在已安装插件列表中启用 "Obsidian Agent Chat"
echo 5. 确保 Agent API 服务正在运行 (http://127.0.0.1:8001)
echo.
pause