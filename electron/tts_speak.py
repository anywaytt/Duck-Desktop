import sys
import subprocess
import re

def escape_powershell_string(s):
    """转义PowerShell字符串中的特殊字符"""
    # 转义反引号（PowerShell的转义字符）
    s = s.replace('`', '``')
    # 转义单引号（在单引号字符串中）
    s = s.replace("'", "''")
    # 转义美元符号（变量前缀）
    s = s.replace('$', '`$')
    # 转义双引号
    s = s.replace('"', '`"')
    return s

try:
    text = sys.argv[1] if len(sys.argv) > 1 else "\u5728\u7684\uff0c\u6211\u5728\u8fd9\u91cc\uff01"
    # 转义文本中的特殊字符
    escaped_text = escape_powershell_string(text)
    # 使用单引号包裹，避免变量扩展
    ps_command = f"Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('{escaped_text}')"
    subprocess.run([
        "powershell", "-NoProfile", "-Command", ps_command
    ], windowsHide=True, timeout=8)
except Exception as e:
    print(f"TTS error: {e}", file=sys.stderr)
