#!/usr/bin/env python3
"""One-shot speech recognition for Duck Chat mic button.
Records audio until silence, transcribes with faster-whisper.
Uses shared whisper_model.py for model management.

Usage: python chat_mic.py [--max-seconds 30] [--device DEVICE_ID]
"""

import sys, os, time, tempfile, wave, math, json, argparse

# Add script directory to path for importing shared modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Force UTF-8 output for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 300      # RMS amplitude (lower = more sensitive)
SILENCE_DURATION = 1.5       # seconds of silence to stop recording
MAX_SECONDS = 30
CHUNK_MS = 200               # smaller chunks for better silence detection


def find_best_mic():
    """Find the best microphone device (prefer headset mic over virtual/Realtek)."""
    try:
        import sounddevice as sd
        devices = sd.query_devices()
        headset_keywords = ["headset", "headphone", "耳机", "wireless", "bluetooth"]
        virtual_keywords = ["virtual", "mixer", "mapper", "stereo", "映射", "混音"]

        # Priority 1: Headset / wireless / bluetooth mic
        for i, d in enumerate(devices):
            if d["max_input_channels"] <= 0:
                continue
            name = d["name"].lower()
            if any(kw in name for kw in headset_keywords) and not any(kw in name for kw in virtual_keywords):
                return i

        # Priority 2: Non-virtual hardware mic (Realtek etc.)
        for i, d in enumerate(devices):
            if d["max_input_channels"] <= 0:
                continue
            name = d["name"].lower()
            if not any(kw in name for kw in virtual_keywords):
                return i

        # Priority 3: First available input
        for i, d in enumerate(devices):
            if d["max_input_channels"] > 0:
                return i
        return None
    except Exception:
        return None


def record_audio(device_id=None, max_sec=MAX_SECONDS):
    """Record from mic until silence detected. Returns path to WAV file."""
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError:
        print("ERROR: sounddevice/numpy not installed", file=sys.stderr)
        return None

    chunk_size = int(SAMPLE_RATE * CHUNK_MS / 1000)
    all_audio = []
    silence_start = None
    has_speech = False
    start_time = time.time()

    try:
        stream_kwargs = dict(
            samplerate=SAMPLE_RATE, channels=1, dtype="int16",
            blocksize=chunk_size
        )
        if device_id is not None:
            stream_kwargs["device"] = device_id

        with sd.InputStream(**stream_kwargs) as stream:
            while True:
                elapsed = time.time() - start_time
                if elapsed > max_sec:
                    break

                data, overflowed = stream.read(chunk_size)
                audio = data[:, 0]
                all_audio.append(audio.copy())

                rms = math.sqrt(sum(int(s) ** 2 for s in audio) / len(audio)) if len(audio) > 0 else 0

                if rms > SILENCE_THRESHOLD:
                    has_speech = True
                    silence_start = None
                elif has_speech:
                    if silence_start is None:
                        silence_start = time.time()
                    elif time.time() - silence_start > SILENCE_DURATION:
                        break

        if not all_audio:
            return None

        import numpy as np
        audio_data = np.concatenate(all_audio)
        wav_path = os.path.join(tempfile.gettempdir(), "duck_mic_recording.wav")
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(audio_data.tobytes())
        return wav_path

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return None


# Use shared whisper model from whisper_model.py
from whisper_model import transcribe as _whisper_transcribe


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-seconds", type=int, default=MAX_SECONDS)
    parser.add_argument("--device", type=int, default=None)
    args = parser.parse_args()

    # Determine device
    device_id = args.device
    if device_id is None:
        device_id = find_best_mic()

    wav_path = record_audio(device_id=device_id, max_sec=args.max_seconds)
    if not wav_path:
        print("", flush=True)
        return

    text = _whisper_transcribe(wav_path)
    print(text, flush=True)

    try:
        os.unlink(wav_path)
    except Exception:
        pass


if __name__ == "__main__":
    main()
