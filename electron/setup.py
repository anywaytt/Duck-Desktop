#!/usr/bin/env python3
"""Duck Desktop first-run setup: detect & install dependencies."""
import sys, os, json, subprocess, shutil, time, platform

def emit(event, **kwargs):
    print(json.dumps({"event": event, **kwargs}, ensure_ascii=False), flush=True)

def run_cmd(cmd, timeout=300):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=True)
        return r.returncode == 0, r.stdout.strip(), r.stderr.strip()
    except subprocess.TimeoutExpired:
        return False, "", "timeout"
    except Exception as e:
        return False, "", str(e)

def find_python():
    for cmd in ["python", "python3", "py -3"]:
        ok, out, _ = run_cmd(cmd + " --version")
        if ok and "Python 3." in out:
            ver = out.split()[-1]
            major, minor = ver.split(".")[:2]
            if int(major) == 3 and int(minor) >= 8:
                ok2, path, _ = run_cmd(cmd + " -c \"import sys; print(sys.executable)\"")
                if ok2:
                    return path.strip(), ver
    candidates = [
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python311\python.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python312\python.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python310\python.exe"),
    ]
    for p in candidates:
        if os.path.exists(p):
            ok, out, _ = run_cmd("\"" + p + "\" --version")
            if ok and "Python 3." in out:
                return p, out.split()[-1]
    return None, None

def check_package(python_path, name):
    ok, _, _ = run_cmd("\"" + python_path + "\" -c \"import " + name + "\"")
    return ok

def check_whisper_model():
    hf_home = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface"))
    model_dir = os.path.join(hf_home, "hub", "models--Systran--faster-whisper-small")
    return os.path.isdir(model_dir)

def check_vosk_model():
    model_dir = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Duck Desktop", "vosk-model", "vosk-model-small-cn-0.22")
    return os.path.isdir(model_dir)

def check_hermes():
    hermes_home = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "hermes-agent")
    venv_python = os.path.join(hermes_home, "venv", "Scripts", "python.exe")
    return os.path.exists(venv_python), hermes_home

def check_gpu():
    ok, out, _ = run_cmd("nvidia-smi --query-gpu=name --format=csv,noheader")
    if ok:
        return True, out.split("\n")[0].strip()
    return False, None

def find_pip(python_path):
    ok, _, _ = run_cmd("\"" + python_path + "\" -m pip --version")
    return ok

def do_check():
    results = {}
    items = [
        ("python", "Python 3.8+"),
        ("pip", "pip"),
        ("sounddevice", "sounddevice"),
        ("numpy", "numpy"),
        ("faster-whisper", "faster_whisper"),
        ("whisper-model", "Whisper small"),
        ("vosk-model", "Vosk CN"),
        ("hermes", "Hermes Agent"),
        ("gpu", "NVIDIA GPU"),
    ]

    py_path, py_ver = find_python()
    emit("checking", item="python")
    if py_path:
        results["python"] = True
        emit("result", item="python", ok=True, detail="Python " + py_ver)
    else:
        results["python"] = False
        emit("result", item="python", ok=False, detail="Not found")
        emit("done", all_ok=False)
        return

    emit("checking", item="pip")
    pip_ok = find_pip(py_path)
    results["pip"] = pip_ok
    emit("result", item="pip", ok=pip_ok, detail="OK" if pip_ok else "Not found")

    deps = [("sounddevice","sounddevice"), ("numpy","numpy"), ("faster-whisper","faster_whisper")]
    for name, imp in deps:
        emit("checking", item=name)
        ok = check_package(py_path, imp)
        results[name] = ok
        emit("result", item=name, ok=ok, detail="OK" if ok else "Not installed")

    emit("checking", item="whisper-model")
    wm = check_whisper_model()
    results["whisper-model"] = wm
    emit("result", item="whisper-model", ok=wm, detail="Cached" if wm else "Not downloaded")

    emit("checking", item="vosk-model")
    vm = check_vosk_model()
    results["vosk-model"] = vm
    emit("result", item="vosk-model", ok=vm, detail="Found" if vm else "Not found")

    emit("checking", item="hermes")
    hm, _ = check_hermes()
    results["hermes"] = hm
    emit("result", item="hermes", ok=hm, detail="Installed" if hm else "Not installed")

    emit("checking", item="gpu")
    gpu_ok, gpu_name = check_gpu()
    results["gpu"] = gpu_ok
    emit("result", item="gpu", ok=gpu_ok, detail=gpu_name if gpu_ok else "No NVIDIA GPU")

    all_ok = all(results.get(k, False) for k in ["python","pip","sounddevice","numpy","faster-whisper","whisper-model","hermes"])
    emit("done", all_ok=all_ok)

def do_install_deps(python_path=None):
    if not python_path:
        py_path, _ = find_python()
        if not py_path:
            emit("error", message="No Python found")
            return
        python_path = py_path
    packages = ["sounddevice", "numpy", "faster-whisper"]
    for pkg in packages:
        emit("installing", item=pkg)
        ok, _, err = run_cmd("\"" + python_path + "\" -m pip install " + pkg, timeout=600)
        emit("installed", item=pkg, ok=ok, error=err[:200] if not ok else None)
    emit("deps-done", ok=True)

def do_install_model():
    emit("installing", item="whisper-model")
    py_path, _ = find_python()
    if not py_path:
        emit("error", message="No Python")
        return
    code = "from faster_whisper import WhisperModel; model = WhisperModel('small', device='cuda', compute_type='float16'); print('ok')"
    ok, out, err = run_cmd("\"" + py_path + "\" -c \"" + code + "\"", timeout=600)
    if ok and "ok" in out:
        emit("installed", item="whisper-model", ok=True)
    else:
        code2 = "from faster_whisper import WhisperModel; model = WhisperModel('small', device='cpu', compute_type='int8'); print('ok')"
        ok2, out2, _ = run_cmd("\"" + py_path + "\" -c \"" + code2 + "\"", timeout=600)
        emit("installed", item="whisper-model", ok=ok2, note="CPU mode" if ok2 else None)
    emit("model-done", ok=True)

def do_install():
    do_install_deps()
    do_install_model()
    emit("all-done", ok=True)

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "check"
    if action == "check": do_check()
    elif action == "install": do_install()
    elif action == "install-deps": do_install_deps(sys.argv[2] if len(sys.argv) > 2 else None)
    elif action == "install-model": do_install_model()
    else: emit("error", message="Unknown action")

if __name__ == "__main__": main()
