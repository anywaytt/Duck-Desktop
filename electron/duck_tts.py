#!/usr/bin/env python3
"""Duck TTS - edge-tts语音合成（自动安装依赖）"""
import sys, subprocess, os, asyncio, json

def ensure_edge_tts():
    """检测edge-tts是否安装，没有就自动装"""
    try:
        import edge_tts
        return True
    except ImportError:
        pass
    print("[TTS] 正在安装edge-tts...", flush=True)
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts", "-q"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import edge_tts
        print("[TTS] edge-tts安装成功", flush=True)
        return True
    except Exception as e:
        print(f"[TTS] 安装失败: {e}", flush=True)
        return False

async def synthesize(text, voice="zh-CN-XiaoxiaoNeural", output_path=None):
    """合成语音并保存到文件"""
    import edge_tts
    if not output_path:
        import tempfile
        output_path = os.path.join(tempfile.gettempdir(), f"duck_tts_{os.getpid()}.mp3")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    return output_path

def list_voices():
    """列出可用的中文语音"""
    import edge_tts
    voices = asyncio.get_event_loop().run_until_complete(edge_tts.list_voices())
    zh_voices = [v for v in voices if v["Locale"].startswith("zh-")]
    result = []
    for v in zh_voices:
        result.append({"id": v["ShortName"], "name": v["LocalName"], "gender": v["Gender"]})
    return result

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["speak", "voices", "check"])
    parser.add_argument("--text", default="")
    parser.add_argument("--voice", default="zh-CN-XiaoxiaoNeural")
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    if args.action == "check":
        ok = ensure_edge_tts()
        print(json.dumps({"ok": ok}))
    elif args.action == "voices":
        if ensure_edge_tts():
            print(json.dumps(list_voices(), ensure_ascii=False))
        else:
            print("[]")
    elif args.action == "speak":
        if not args.text:
            print(json.dumps({"error": "no text"}))
            sys.exit(1)
        if ensure_edge_tts():
            loop = asyncio.new_event_loop()
            path = loop.run_until_complete(synthesize(args.text, args.voice, args.output or None))
            print(json.dumps({"ok": True, "path": path}))
        else:
            print(json.dumps({"error": "edge-tts not available"}))
