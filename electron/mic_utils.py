"""
Microphone utilities for Duck Desktop voice engine.
Handles mic selection, testing, and noise calibration.
"""
import sys
import time

SAMPLE_RATE = 16000
BLOCK_SIZE = 2000
SPEECH_THRESHOLD_DEFAULT = 400
ADAPTIVE_CALIBRATE_SEC = 2


def _test_mic(device_id):
    """Test if a mic device can actually be opened with RawInputStream."""
    try:
        import sounddevice as sd
        with sd.RawInputStream(device=device_id, samplerate=SAMPLE_RATE,
                               blocksize=BLOCK_SIZE, dtype="int16", channels=1):
            pass
        return True
    except Exception:
        return False


def find_best_mic():
    """Find a working mic. Prefers headset/wireless over Realtek/virtual."""
    try:
        import sounddevice as sd
        devices = sd.query_devices()

        headset_keywords = ["headset", "headphone", "耳机", "wireless", "bluetooth"]
        virtual_keywords = ["virtual", "mixer", "mapper", "stereo", "映射", "混音", "output", "输出", "主声音"]

        # Priority 1: Headset / wireless / bluetooth mic
        for i, d in enumerate(devices):
            if d["max_input_channels"] <= 0:
                continue
            name = d["name"].lower()
            if any(kw in name for kw in headset_keywords) and not any(kw in name for kw in virtual_keywords):
                if _test_mic(i):
                    return i

        # Priority 2: Non-virtual hardware mic (Realtek etc.)
        for i, d in enumerate(devices):
            if d["max_input_channels"] <= 0:
                continue
            name = d["name"].lower()
            if not any(kw in name for kw in virtual_keywords):
                if _test_mic(i):
                    return i

        # Priority 3: Any working input
        for i, d in enumerate(devices):
            if d["max_input_channels"] > 0:
                if _test_mic(i):
                    return i
    except Exception:
        pass

    # Last resort: system default input device
    try:
        import sounddevice as sd
        default_in = sd.default.device[0]
        if default_in is not None and default_in >= 0:
            if _test_mic(default_in):
                return default_in
    except Exception:
        pass
    return None


def calibrate_noise(device_id=None, duration=ADAPTIVE_CALIBRATE_SEC):
    """Measure ambient noise level to set adaptive speech threshold."""
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError:
        return SPEECH_THRESHOLD_DEFAULT

    samples = []
    chunk_size = int(SAMPLE_RATE * 0.1)  # 100ms chunks

    def cal_callback(indata, frames, time_info, status):
        audio = np.frombuffer(indata, dtype=np.int16)
        rms = float(np.sqrt(np.mean(audio.astype(np.float32) ** 2)))
        samples.append(rms)

    try:
        kwargs = dict(samplerate=SAMPLE_RATE, blocksize=chunk_size,
                      dtype="int16", channels=1, callback=cal_callback)
        if device_id is not None:
            kwargs["device"] = device_id
        with sd.RawInputStream(**kwargs):
            time.sleep(duration)
    except Exception:
        return SPEECH_THRESHOLD_DEFAULT

    if not samples:
        return SPEECH_THRESHOLD_DEFAULT

    avg_noise = sum(samples) / len(samples)
    threshold = max(avg_noise * 3, 200)
    threshold = min(threshold, 800)
    print("NOISE_CAL: ambient={:.0f} threshold={:.0f}".format(avg_noise, threshold),
          file=sys.stderr, flush=True)
    return threshold


def get_device_name(device_id):
    """Get the display name of a mic device."""
    try:
        import sounddevice as sd
        dev_info = sd.query_devices()[device_id]
        return dev_info['name']
    except Exception:
        return "unknown"
