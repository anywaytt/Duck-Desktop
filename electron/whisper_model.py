"""
Whisper model management for Duck Desktop voice engine.
Handles model loading with GPU/CPU fallback and transcription.
"""
import sys

# ── Whisper model (cached, GPU/CPU auto-detect) ──────────────────
_whisper_model = None
_whisper_device = "none"


def get_whisper():
    """Load faster-whisper with medium(GPU) -> small(GPU) -> small(CPU) fallback. Cached."""
    global _whisper_model, _whisper_device
    if _whisper_model is not None:
        return _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("WHISPER_INIT: missing", file=sys.stderr, flush=True)
        return None

    # Try CUDA with medium model (best quality for 2080Ti 11GB)
    try:
        import torch
        if torch.cuda.is_available():
            print("WHISPER_INIT: cuda medium", file=sys.stderr, flush=True)
            _whisper_model = WhisperModel("medium", device="cuda", compute_type="float16")
            _whisper_device = "cuda-medium"
            return _whisper_model
    except Exception as e:
        print("WHISPER_MEDIUM_FAIL: {}".format(e), file=sys.stderr, flush=True)

    # Try CUDA with small model
    try:
        import torch
        if torch.cuda.is_available():
            print("WHISPER_INIT: cuda small", file=sys.stderr, flush=True)
            _whisper_model = WhisperModel("small", device="cuda", compute_type="float16")
            _whisper_device = "cuda"
            return _whisper_model
    except Exception as e:
        print("WHISPER_CUDA_FAIL: {}".format(e), file=sys.stderr, flush=True)

    # CPU fallback
    try:
        print("WHISPER_INIT: cpu", file=sys.stderr, flush=True)
        _whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
        _whisper_device = "cpu"
        return _whisper_model
    except Exception:
        pass

    # Last resort: tiny model
    try:
        print("WHISPER_INIT: cpu-tiny", file=sys.stderr, flush=True)
        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
        _whisper_device = "cpu-tiny"
        return _whisper_model
    except Exception as e:
        print("WHISPER_FAIL: {}".format(e), file=sys.stderr, flush=True)
        return None


def transcribe(wav_path):
    """Transcribe a WAV file. Returns empty string on failure."""
    model = get_whisper()
    if model is None:
        return ""
    try:
        segments, info = model.transcribe(
            wav_path, language="zh", beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        texts = []
        for seg in segments:
            t = seg.text.strip()
            if t:
                texts.append(t)
        result = " ".join(texts).strip()
        if result:
            print("WHISPER_OK: model={}".format(_whisper_device), file=sys.stderr, flush=True)
        return result
    except Exception as e:
        print("WHISPER_ERR: {}".format(e), file=sys.stderr, flush=True)
        return ""


def preload_in_background():
    """Preload whisper model in a background thread."""
    import threading
    threading.Thread(target=get_whisper, daemon=True).start()
