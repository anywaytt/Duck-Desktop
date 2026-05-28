#!/usr/bin/env python3
"""
Duck Desktop voice engine -- optimized hybrid architecture.

Wake word detection:  Vosk small model (~66MB), lightweight, real-time.
Speech recognition:   faster-whisper medium (GPU) / small (CPU), high quality.
Noise adaptation:     Auto-calibrate speech threshold from ambient noise.
Audio level:          Real-time RMS reporting for UI visualization.

Protocol (stdout, one line per event):
  WAKE                  -- wake word detected, show dialog
  SPEECH: <text>        -- recognized speech in conversation mode
  SILENCE               -- long silence, auto-hide dialog

One-shot mode (--one-shot):
  Outputs transcribed text directly (no prefix), then exits.

Stdin commands (when running as persistent process):
  chat_mic              -- enter one-shot recording mode
  stop_chat_mic         -- cancel current recording

Stderr events:
  AUDIO_LEVEL: {"level": N, "threshold": N}  -- real-time audio level
  WHISPER_OK: model=<dev>                     -- successful transcription
"""

import sys, os, json, time, wave, tempfile, math, threading, queue

# Force UTF-8 output for Windows (prevents garbled Chinese in Electron pipe)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── Extracted Modules ─────────────────────────────────────────────
from whisper_model import transcribe, preload_in_background
from mic_utils import find_best_mic, calibrate_noise, get_device_name

# -- Config ----------------------------------------------------------------
SAMPLE_RATE = 16000
BLOCK_SIZE = 2000              # 125ms blocks for responsive wake detection

# Wake words (Chinese + English + phonetic fallbacks for Vosk CN model)
WAKE_WORDS = [
    "ya zi", "xiao ya", "hei ya", "ni hao ya",
    "duck", "hey duck", "hi duck", "hey dd",
    "hei di di",
    "\u5c0f\u9e2d\u5b50", "\u9e2d\u5b50", "\u563f\u9e2d\u5b50", "\u4f60\u597d\u9e2d\u5b50",
    "\u9e2d", "\u5c0f\u9e2d", "\u563f\u9e2d", "\u4f60\u597d\u9e2d\u9e2d",
]

# Conversation timing
SILENCE_TIMEOUT = 8            # seconds of silence -> auto-hide dialog
WAKE_COOLDOWN = 3              # seconds between wake detections
UTTERANCE_SILENCE = 1.5        # seconds of silence -> end of utterance
UTTERANCE_MAX = 15             # max seconds per utterance
SPEECH_THRESHOLD_DEFAULT = 400 # default RMS threshold (overridden by adaptive)

# Continuous listening mode
CONTINUOUS_IDLE_TIMEOUT = 300  # seconds of no speech -> return to wake mode (5 minutes)

# One-shot mode timing
ONE_SHOT_SILENCE = 1.8         # seconds of silence to stop in one-shot mode
ONE_SHOT_MAX = 30              # max seconds for one-shot recording
ONE_SHOT_THRESHOLD = 300       # RMS threshold for one-shot (more sensitive)

# Audio level reporting
LEVEL_REPORT_INTERVAL = 0.15   # seconds between audio level reports


# -- Wake word check --------------------------------------------------------
def check_wake(text):
    t = text.lower().strip()
    for w in WAKE_WORDS:
        if w in t:
            return True
    return False


# -- One-shot mode (for chat mic button) ------------------------------------
def run_one_shot(device_id=None):
    """Record one utterance, transcribe, print result, exit."""
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError:
        print("ERROR: sounddevice/numpy not installed", file=sys.stderr)
        return

    threshold = calibrate_noise(device_id, duration=1)

    chunk_ms = 100
    chunk_size = int(SAMPLE_RATE * chunk_ms / 1000)
    all_audio = []
    has_speech = [False]
    silence_start = [None]
    start_time = time.time()
    stopped = [False]

    def callback(indata, frames, time_info, status):
        if stopped[0]:
            raise sd.CallbackStop()
        audio = np.frombuffer(indata, dtype=np.int16).copy()
        all_audio.append(audio)

        rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))
        now = time.time()

        if rms > threshold:
            has_speech[0] = True
            silence_start[0] = None
        elif has_speech[0]:
            if silence_start[0] is None:
                silence_start[0] = now
            elif now - silence_start[0] > ONE_SHOT_SILENCE:
                stopped[0] = True

        if now - start_time > ONE_SHOT_MAX:
            stopped[0] = True

    try:
        kwargs = dict(samplerate=SAMPLE_RATE, blocksize=chunk_size,
                      dtype="int16", channels=1, callback=callback)
        if device_id is not None:
            kwargs["device"] = device_id
        with sd.RawInputStream(**kwargs):
            while not stopped[0]:
                time.sleep(0.1)
    except Exception:
        pass

    if not all_audio or not has_speech[0]:
        return

    try:
        audio_data = np.concatenate(all_audio)
        wav_path = os.path.join(tempfile.gettempdir(), "duck_chat_mic.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(audio_data.tobytes())

        text = transcribe(wav_path)
        if text:
            print(text, flush=True)

        try:
            os.unlink(wav_path)
        except Exception:
            pass
    except Exception as e:
        print("MIC_ERR: {}".format(e), file=sys.stderr, flush=True)


# -- Main wake listener -----------------------------------------------------
def run_wake_listener():
    """Main loop: wake detection + conversation mode + stdin commands."""
    import sounddevice as sd

    MODEL_DIR = os.path.join(
        os.path.expanduser("~"), "AppData", "Local", "Duck Desktop",
        "vosk-model", "vosk-model-small-cn-0.22"
    )
    model_path = os.path.abspath(MODEL_DIR)
    if not os.path.exists(model_path):
        print("ERROR: Vosk model not found at {}".format(model_path), file=sys.stderr)
        sys.exit(1)

    # Select microphone
    device_id = find_best_mic()
    if device_id is not None:
        dev_name = get_device_name(device_id)
        print("VOICE_DEVICE: [{}] {}".format(device_id, dev_name),
              file=sys.stderr, flush=True)

    # Adaptive noise calibration
    speech_threshold = calibrate_noise(device_id)

    # Init Vosk
    print("Voice engine starting (Vosk wake + Whisper speech, optimized)...",
          flush=True)
    from vosk import Model, KaldiRecognizer
    vmodel = Model(model_path)
    rec = KaldiRecognizer(vmodel, SAMPLE_RATE)
    rec.SetWords(False)

    # Preload faster-whisper in background
    preload_in_background()

    # -- State ---------------------------------------------------------
    mode = ["wake"]               # "wake" | "conv" | "one_shot" (list for mutability in nested funcs)
    last_wake = [0.0]
    last_speech = [0.0]
    silence_checked = [False]
    last_level_time = [0.0]

    # Continuous listening mode state
    continuous_mode = [False]     # True = continuous mode (no re-wake needed)
    continuous_idle_start = [0.0] # when continuous mode entered idle state

    # Conversation recording state
    conv_audio = []
    conv_silence_start = [None]
    conv_has_speech = [False]
    conv_start_time = [0.0]

    # One-shot state
    one_shot_data = {"audio": [], "has_speech": False, "silence_start": None, "start_time": 0.0}

    # Stdin command queue
    cmd_queue = queue.Queue()

    def stdin_reader():
        try:
            for line in sys.stdin:
                cmd = line.strip()
                if cmd:
                    cmd_queue.put(cmd)
                elif line == "":
                    break
        except Exception:
            pass

    stdin_thread = threading.Thread(target=stdin_reader, daemon=True)
    stdin_thread.start()

    def finish_utterance():
        """Save accumulated conversation audio, transcribe, output result."""
        if not conv_audio or not conv_has_speech[0]:
            conv_audio.clear()
            conv_has_speech[0] = False
            return
        try:
            import numpy as np
            audio_data = np.concatenate(conv_audio)
            wav_path = os.path.join(tempfile.gettempdir(), "duck_wake_utterance.wav")
            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(SAMPLE_RATE)
                wf.writeframes(audio_data.tobytes())

            text = transcribe(wav_path)
            if text:
                print("SPEECH: {}".format(text), flush=True)

            try:
                os.unlink(wav_path)
            except Exception:
                pass
        except Exception as e:
            print("UTTERANCE_ERR: {}".format(e), file=sys.stderr, flush=True)
        finally:
            conv_audio.clear()
            conv_has_speech[0] = False

    def finish_one_shot():
        """Transcribe and output one-shot result."""
        d = one_shot_data
        if not d["audio"] or not d["has_speech"]:
            mode[0] = "wake"
            print("CHAT_MIC_DONE", flush=True)
            return
        try:
            import numpy as np
            audio_data = np.concatenate(d["audio"])
            wav_path = os.path.join(tempfile.gettempdir(), "duck_chat_mic.wav")
            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(SAMPLE_RATE)
                wf.writeframes(audio_data.tobytes())

            text = transcribe(wav_path)
            if text:
                print(text, flush=True)
            print("CHAT_MIC_DONE", flush=True)

            try:
                os.unlink(wav_path)
            except Exception:
                pass
        except Exception as e:
            print("ONE_SHOT_ERR: {}".format(e), file=sys.stderr, flush=True)
            print("CHAT_MIC_DONE", flush=True)
        mode[0] = "wake"

    def callback(indata, frames, time_info, status):
        data = bytes(indata)
        now = time.time()
        cur_mode = mode[0]

        # -- Process pending stdin commands --
        while not cmd_queue.empty():
            try:
                cmd = cmd_queue.get_nowait()
            except queue.Empty:
                break
            if cmd == "chat_mic" and (cur_mode == "wake" or cur_mode == "conv"):
                # 如果当前是对话模式，先清理状态
                if cur_mode == "conv":
                    conv_audio.clear()
                    conv_has_speech[0] = False
                    conv_silence_start[0] = None
                mode[0] = "one_shot"
                one_shot_data["audio"] = []
                one_shot_data["has_speech"] = False
                one_shot_data["silence_start"] = None
                one_shot_data["start_time"] = now
                cur_mode = "one_shot"
            elif cmd == "stop_chat_mic" and mode[0] == "one_shot":
                finish_one_shot()
                rec.Reset()
                cur_mode = "wake"
            elif cmd == "set_mode continuous":
                continuous_mode[0] = True
                continuous_idle_start[0] = 0.0
                print("MODE: continuous", flush=True)
            elif cmd == "set_mode normal":
                continuous_mode[0] = False
                continuous_idle_start[0] = 0.0
                print("MODE: normal", flush=True)

        # -- Audio level reporting --
        if now - last_level_time[0] >= LEVEL_REPORT_INTERVAL:
            last_level_time[0] = now
            try:
                import numpy as np
                audio_np = np.frombuffer(data, dtype=np.int16)
                rms = float(np.sqrt(np.mean(audio_np.astype(np.float32) ** 2)))
                info = json.dumps({"level": round(rms), "threshold": round(speech_threshold)}, separators=(',', ':'))
                print("AUDIO_LEVEL: {}".format(info), file=sys.stderr, flush=True)
            except Exception:
                pass

        # -- One-shot mode: just record --
        if cur_mode == "one_shot":
            try:
                import numpy as np
                audio = np.frombuffer(data, dtype=np.int16).copy()
                one_shot_data["audio"].append(audio)

                rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))

                if rms > ONE_SHOT_THRESHOLD:
                    one_shot_data["has_speech"] = True
                    one_shot_data["silence_start"] = None
                elif one_shot_data["has_speech"]:
                    if one_shot_data["silence_start"] is None:
                        one_shot_data["silence_start"] = now
                    elif now - one_shot_data["silence_start"] > ONE_SHOT_SILENCE:
                        finish_one_shot()
                        one_shot_data["audio"] = []
                        one_shot_data["has_speech"] = False
                        one_shot_data["silence_start"] = None
                        rec.Reset()
                        return

                if now - one_shot_data["start_time"] > ONE_SHOT_MAX:
                    finish_one_shot()
                    one_shot_data["audio"] = []
                    one_shot_data["has_speech"] = False
                    one_shot_data["silence_start"] = None
                    rec.Reset()
            except Exception:
                pass
            return

        # -- Wake word detection (always run Vosk) --
        if cur_mode == "wake":
            if rec.AcceptWaveform(data):
                try:
                    result = json.loads(rec.Result())
                    text = result.get("text", "").strip()
                    if text and now - last_wake[0] > WAKE_COOLDOWN and check_wake(text):
                        last_wake[0] = now
                        print("WAKE", flush=True)
                        mode[0] = "conv"
                        last_speech[0] = now
                        silence_checked[0] = False
                        conv_audio.clear()
                        conv_silence_start[0] = None
                        conv_has_speech[0] = False
                        conv_start_time[0] = now
                        rec.Reset()
                        return
                except Exception:
                    pass
            else:
                try:
                    partial = json.loads(rec.PartialResult())
                    text = partial.get("partial", "").strip()
                    if text and now - last_wake[0] > WAKE_COOLDOWN and check_wake(text):
                        last_wake[0] = now
                        print("WAKE", flush=True)
                        mode[0] = "conv"
                        last_speech[0] = now
                        silence_checked[0] = False
                        conv_audio.clear()
                        conv_silence_start[0] = None
                        conv_has_speech[0] = False
                        conv_start_time[0] = now
                        rec.Reset()
                        return
                except Exception:
                    pass

        # -- Conversation mode: record + VAD --
        if mode[0] == "conv":
            import numpy as np
            audio = np.frombuffer(data, dtype=np.int16).copy()
            conv_audio.append(audio)

            rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))

            if rms > speech_threshold:
                conv_has_speech[0] = True
                conv_silence_start[0] = None
                last_speech[0] = now
                silence_checked[0] = False
                # Reset continuous idle timer when speech detected
                if continuous_mode[0]:
                    continuous_idle_start[0] = 0.0
            elif conv_has_speech[0]:
                if conv_silence_start[0] is None:
                    conv_silence_start[0] = now
                elif now - conv_silence_start[0] > UTTERANCE_SILENCE:
                    finish_utterance()
                    conv_silence_start[0] = None
                    last_speech[0] = now

            if now - conv_start_time[0] > UTTERANCE_MAX and conv_has_speech[0]:
                finish_utterance()
                conv_silence_start[0] = None
                last_speech[0] = now
                conv_start_time[0] = now

            if not silence_checked[0]:
                if now - last_speech[0] > SILENCE_TIMEOUT:
                    silence_checked[0] = True
                    print("SILENCE", flush=True)
                    if continuous_mode[0]:
                        # 连续模式：不切换回wake，继续监听
                        continuous_idle_start[0] = now
                        # 清理对话状态，准备下一次语音
                        conv_audio.clear()
                        conv_has_speech[0] = False
                        conv_silence_start[0] = None
                        conv_start_time[0] = now
                    else:
                        # 普通模式：切换回wake
                        mode[0] = "wake"
                        rec.Reset()

    # -- Audio stream --------------------------------------------------
    try:
        stream_kwargs = dict(
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            dtype="int16",
            channels=1,
            callback=callback,
        )
        if device_id is not None:
            stream_kwargs["device"] = device_id

        with sd.RawInputStream(**stream_kwargs):
            print("Ready. Say '\u9e2d\u5b50' to start conversation.", flush=True)
            while True:
                time.sleep(0.3)
                cur_time = time.time()

                # Backup silence check for conversation mode
                if mode[0] == "conv" and not silence_checked[0]:
                    if cur_time - last_speech[0] > SILENCE_TIMEOUT + 1:
                        silence_checked[0] = True
                        print("SILENCE", flush=True)
                        if continuous_mode[0]:
                            continuous_idle_start[0] = cur_time
                            conv_audio.clear()
                            conv_has_speech[0] = False
                            conv_silence_start[0] = None
                            conv_start_time[0] = cur_time
                        else:
                            mode[0] = "wake"
                            rec.Reset()

                # Continuous mode idle timeout: return to wake after long silence
                if continuous_mode[0] and continuous_idle_start[0] > 0:
                    if cur_time - continuous_idle_start[0] > CONTINUOUS_IDLE_TIMEOUT:
                        print("CONTINUOUS_IDLE_TIMEOUT", flush=True)
                        continuous_mode[0] = False
                        continuous_idle_start[0] = 0.0
                        mode[0] = "wake"
                        rec.Reset()
                        print("MODE: normal", flush=True)

    except KeyboardInterrupt:
        print("Stopped", flush=True)
    except Exception as e:
        print("Audio error: {}".format(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--one-shot", action="store_true",
                        help="One-shot recording mode (for chat mic button)")
    parser.add_argument("--device", type=int, default=None,
                        help="Microphone device ID")
    args = parser.parse_args()

    device_id = args.device
    if device_id is None:
        device_id = find_best_mic()

    if args.one_shot:
        run_one_shot(device_id)
    else:
        run_wake_listener()
