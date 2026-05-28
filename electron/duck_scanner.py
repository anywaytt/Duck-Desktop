#!/usr/bin/env python3
"""Duck Scanner - 桌面扫描 + 系统信息采集"""
import os, sys, json, platform, glob

def scan_desktop():
    """扫描桌面快捷方式和文件，检测已安装软件"""
    desktop_paths = []
    # 用户桌面
    user_desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    if os.path.isdir(user_desktop):
        desktop_paths.append(user_desktop)
    # 公共桌面
    public_desktop = os.path.join(os.environ.get("PUBLIC", ""), "Desktop")
    if os.path.isdir(public_desktop):
        desktop_paths.append(public_desktop)

    shortcuts = []
    files = []
    detected_apps = set()

    # 已知软件关键词映射
    known_apps = {
        "hermes": "Hermes Agent", "claude": "Claude", "cursor": "Cursor",
        "豆包": "豆包(Doubao)", "doubao": "豆包(Doubao)", "tencent": "腾讯",
        "wechat": "微信", "微信": "微信", "qq": "QQ", "dingtalk": "钉钉", "钉钉": "钉钉",
        "feishu": "飞书", "飞书": "飞书", "vscode": "VS Code", "visual studio": "Visual Studio",
        "docker": "Docker", "node": "Node.js", "python": "Python", "ollama": "Ollama",
        "chrome": "Chrome", "firefox": "Firefox", "edge": "Edge",
        "obsidian": "Obsidian", "notion": "Notion", "figma": "Figma",
        "git": "Git", "postman": "Postman", "anaconda": "Anaconda",
        "bailongma": "白龙马", "白龙马": "白龙马", "duck": "Duck Desktop",
        "warp": "Warp", "terminal": "Terminal", "powershell": "PowerShell",
        "telegram": "Telegram", "discord": "Discord", "slack": "Slack",
        "spotify": "Spotify", "netflix": "Netflix",
        "steam": "Steam", "epic": "Epic Games",
        "office": "Office", "word": "Word", "excel": "Excel", "powerpoint": "PowerPoint",
        "photoshop": "Photoshop", "premiere": "Premiere",
        "xbrowser": "指纹浏览器", "bitbrowser": "比特浏览器",
        "clash": "Clash", "v2ray": "v2rayN", "shadowsocks": "SS",
    }

    for dp in desktop_paths:
        try:
            for entry in os.listdir(dp):
                full = os.path.join(dp, entry)
                name_lower = entry.lower()
                if name_lower.endswith(('.lnk', '.url', '.desktop')):
                    shortcuts.append(os.path.splitext(entry)[0])
                elif os.path.isdir(full):
                    files.append(entry + "/")
                elif not name_lower.startswith('.') and name_lower not in ('desktop.ini', 'thumbs.db'):
                    files.append(entry)
        except:
            pass

    # 从快捷方式和文件名检测软件
    all_names = ' '.join(shortcuts + files).lower()
    for keyword, app_name in known_apps.items():
        if keyword.lower() in all_names:
            detected_apps.add(app_name)

    return {
        "shortcuts": sorted(shortcuts),
        "files": sorted(files),
        "detected_apps": sorted(detected_apps),
        "desktop_paths": desktop_paths,
    }

def scan_programs():
    """扫描已安装程序（Windows注册表/start menu）"""
    installed = set()
    # Start Menu
    for sm_path in [
        os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs"),
        os.path.join(os.environ.get("PROGRAMDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs"),
    ]:
        if os.path.isdir(sm_path):
            for root, dirs, files in os.walk(sm_path):
                for f in files:
                    if f.endswith('.lnk'):
                        installed.add(os.path.splitext(f)[0])
                # 只扫两层
                if root.replace(sm_path, '').count(os.sep) >= 2:
                    dirs.clear()
    return sorted(installed)

def get_system_info():
    """采集系统信息"""
    import shutil
    info = {
        "os": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "hostname": platform.node(),
        "python": platform.python_version(),
        "home": os.path.expanduser("~"),
    }
    # CPU核心数
    try:
        info["cpu_cores"] = os.cpu_count()
    except:
        pass
    # 磁盘
    try:
        total, used, free = shutil.disk_usage("C:\\")
        info["disk_total_gb"] = round(total / (1024**3), 1)
        info["disk_free_gb"] = round(free / (1024**3), 1)
    except:
        pass
    # 内存
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                        ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                        ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                        ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                        ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        info["ram_total_gb"] = round(stat.ullTotalPhys / (1024**3), 1)
        info["ram_free_gb"] = round(stat.ullAvailPhys / (1024**3), 1)
    except:
        pass
    return info

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "all"
    if action == "desktop":
        print(json.dumps(scan_desktop(), ensure_ascii=False))
    elif action == "programs":
        print(json.dumps(scan_programs(), ensure_ascii=False))
    elif action == "system":
        print(json.dumps(get_system_info(), ensure_ascii=False))
    else:
        result = {
            "desktop": scan_desktop(),
            "system": get_system_info(),
        }
        print(json.dumps(result, ensure_ascii=False))
