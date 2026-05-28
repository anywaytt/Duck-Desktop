@echo off
chcp 65001 >nul
title Hermes Desktop 启动器
echo.
echo  ============================================
echo    Hermes Desktop 桌面客户端
echo  ============================================
echo.

:: 检查可执行文件
set "EXE_PATH=%~dp0release\Hermes Desktop-win32-x64\Hermes Desktop.exe"
if not exist "%EXE_PATH%" (
    echo  [错误] 未找到 Hermes Desktop.exe
    echo  请确认文件路径: %EXE_PATH%
    pause
    exit /b 1
)

echo  [信息] 正在启动 Hermes Desktop...
echo.

:: 启动应用
start "" "%EXE_PATH%"

echo  [完成] Hermes Desktop 已启动！
echo.
timeout /t 3 >nul
