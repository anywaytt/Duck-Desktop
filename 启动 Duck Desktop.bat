@echo off
chcp 65001 >nul
title Duck Desktop 启动器
echo.
echo  ============================================
echo    Duck Desktop - AI智能助手桌面客户端
echo  ============================================
echo.

:: 设置路径
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%"
set "NODE_MODULES=%APP_DIR%node_modules"
set "HERMES_DIR=%LOCALAPPDATA%\hermes\hermes-agent"
set "HERMES_VENV=%HERMES_DIR%\venv"
set "HERMES_EXE=%HERMES_VENV%\Scripts\hermes.exe"

:: ============================================
:: 第一步：检查Node.js环境
:: ============================================
echo [1/6] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ 未找到Node.js
    echo.
    echo 正在自动下载Node.js安装程序...
    echo 请手动安装Node.js 18+，安装完成后重新运行此脚本
    echo.
    echo 下载地址: https://nodejs.org/
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% 已安装

:: ============================================
:: 第二步：检查Python环境
:: ============================================
echo [2/6] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ 未找到Python
    echo.
    echo 正在自动下载Python安装程序...
    echo 请手动安装Python 3.9+，安装完成后重新运行此脚本
    echo.
    echo 下载地址: https://www.python.org/
    echo.
    start https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ %PYTHON_VERSION% 已安装

:: ============================================
:: 第三步：安装Node.js依赖
:: ============================================
echo [3/6] 检查Node.js依赖...
if not exist "%NODE_MODULES%" (
    echo.
    echo 正在安装Node.js依赖（首次运行需要1-3分钟）...
    cd /d "%APP_DIR%"
    call npm install --silent
    if errorlevel 1 (
        echo.
        echo ❌ Node.js依赖安装失败
        echo.
        echo 可能原因：
        echo 1. 网络连接问题
        echo 2. npm镜像问题
        echo.
        echo 尝试使用国内镜像...
        npm config set registry https://registry.npmmirror.com
        call npm install --silent
        if errorlevel 1 (
            echo ❌ 依赖安装仍然失败，请检查网络连接
            pause
            exit /b 1
        )
    )
    echo ✓ Node.js依赖安装完成
) else (
    echo ✓ Node.js依赖已存在
)

:: ============================================
:: 第四步：安装Hermes Agent
:: ============================================
echo [4/6] 检查Hermes Agent...
if not exist "%HERMES_EXE%" (
    echo.
    echo 正在安装Hermes Agent（首次运行需要2-5分钟）...
    echo.
    
    :: 创建目录
    if not exist "%HERMES_DIR%" mkdir "%HERMES_DIR%"
    
    :: 创建虚拟环境
    echo [1/3] 创建Python虚拟环境...
    python -m venv "%HERMES_VENV%"
    if errorlevel 1 (
        echo ❌ 虚拟环境创建失败
        pause
        exit /b 1
    )
    
    :: 激活虚拟环境并安装hermes-agent
    echo [2/3] 安装Hermes Agent...
    call "%HERMES_VENV%\Scripts\activate.bat"
    pip install hermes-agent --quiet
    if errorlevel 1 (
        echo.
        echo ⚠️  Hermes Agent安装失败，尝试使用国内镜像...
        pip install hermes-agent -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
        if errorlevel 1 (
            echo ❌ Hermes Agent安装失败
            echo.
            echo 请手动安装：
            echo pip install hermes-agent
            echo.
            pause
            exit /b 1
        )
    )
    
    :: 初始化Hermes
    echo [3/3] 初始化Hermes配置...
    "%HERMES_EXE%" setup --quick
    if errorlevel 1 (
        echo ⚠️  Hermes初始化失败，首次启动时会自动初始化
    )
    
    echo ✓ Hermes Agent安装完成
) else (
    echo ✓ Hermes Agent已安装
)

:: ============================================
:: 第五步：安装Python依赖
:: ============================================
echo [5/6] 检查Python依赖...
python -c "import sounddevice" >nul 2>&1
if errorlevel 1 (
    echo.
    echo 正在安装Python依赖（语音功能需要）...
    pip install sounddevice numpy --quiet
    if errorlevel 1 (
        echo ⚠️  Python依赖安装失败，语音功能可能不可用
    ) else (
        echo ✓ Python依赖安装完成
    )
) else (
    echo ✓ Python依赖已存在
)

:: ============================================
:: 第六步：启动应用
:: ============================================
echo [6/6] 启动Duck Desktop...
echo.
echo  ============================================
echo   正在启动，请稍候...
echo  ============================================
echo.

:: 启动Hermes Dashboard
if exist "%HERMES_EXE%" (
    echo 启动Hermes Dashboard...
    start "" /MIN cmd /c "set PYTHONUTF8=1 && "%HERMES_EXE%" dashboard --port 9119 --no-open"
    
    :: 等待Hermes启动
    echo 等待Hermes启动（约5秒）...
    timeout /t 5 /nobreak >nul
)

:: 启动Duck Desktop
echo 启动Duck Desktop...
cd /d "%APP_DIR%"

:: 检查是否有打包的exe
if exist "%APP_DIR%release\Duck Desktop-win32-x64\Duck Desktop.exe" (
    start "" "%APP_DIR%release\Duck Desktop-win32-x64\Duck Desktop.exe"
) else if exist "%APP_DIR%release\Duck Desktop.exe" (
    start "" "%APP_DIR%release\Duck Desktop.exe"
) else (
    echo.
    echo ❌ 未找到Duck Desktop可执行文件
    echo.
    echo 请检查打包是否完整
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   ✓ Duck Desktop 已启动！
echo  ============================================
echo.
echo  首次使用提示：
echo  1. 点击左侧 🤖 按钮选择AI模型
echo  2. 如果使用云端模型，需要输入API密钥
echo  3. 如果使用本地模型，需要安装Ollama
echo.
echo  如需帮助，请查看 "使用说明.md"
echo.
timeout /t 8 /nobreak >nul
