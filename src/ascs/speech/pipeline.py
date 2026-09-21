from __future__ import annotations

import io
import math
import wave
from pathlib import Path
from typing import Any

import numpy as np

from ascs.config import ROOT, get_settings

AUDIO_DIR = ROOT / "data" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def _pcm_wav(samples: np.ndarray, sample_rate: int = 22050) -> bytes:
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def synthetic_speech(text: str, voice: str = "river") -> bytes:
    """Deterministic placeholder TTS so demos work without GPU weights.

    Swap TTS_ENGINE=kokoro (or Indic Parler-TTS) in production. Personas are
    original; this function never clones a real commentator.
    """
    sample_rate = 22050
    duration = min(8.0, 0.55 + 0.045 * len(text))
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    base = 180 if "nia" in voice.lower() or "kavya" in voice.lower() else 110
    seed = abs(hash(text)) % 40
    tone = np.sin(2 * math.pi * (base + seed) * t)
    envelope = np.exp(-1.4 * t / duration)
    noise = 0.02 * np.random.default_rng(seed).standard_normal(t.shape)
    return _pcm_wav(0.22 * tone * envelope + noise, sample_rate)


def synthesize(text: str, speaker: str = "River Hale", language: str = "en") -> dict[str, Any]:
    settings = get_settings()
    engine = settings.tts_engine
    voice = "nia" if "Nia" in speaker or "Kavya" in speaker else "river"
    audio = None
    if engine == "kokoro" and language == "en":
        audio = _try_kokoro(text, voice)
    if engine in {"indic", "parler"} and language in {"hi", "ta"}:
        audio = _try_indic(text, language)
    if audio is None:
        audio = synthetic_speech(text, voice)
        engine = "synthetic"
    path = AUDIO_DIR / f"{abs(hash((text, speaker, language))) % 10**12}.wav"
    path.write_bytes(audio)
    return {"engine": engine, "path": str(path), "bytes": audio, "content_type": "audio/wav"}


def _try_kokoro(text: str, voice: str) -> bytes | None:
    try:
        from kokoro import KPipeline  # type: ignore

        pipeline = KPipeline(lang_code="a")
        vid = "af_heart" if voice == "nia" else "am_echo"
        chunks = []
        for _, _, audio in pipeline(text, voice=vid):
            chunks.append(np.asarray(audio))
        if not chunks:
            return None
        return _pcm_wav(np.concatenate(chunks), 24000)
    except Exception:
        return None


def _try_indic(text: str, language: str) -> bytes | None:
    # Indic Parler-TTS is optional. Fall back to synthetic if weights are absent.
    return None


def transcribe(audio_bytes: bytes, filename: str = "question.wav") -> dict[str, Any]:
    settings = get_settings()
    if settings.asr_engine in {"disabled", "", "off"}:
        return {"text": "", "engine": "disabled", "wer_note": "ASR disabled; type the question instead."}
    try:
        from faster_whisper import WhisperModel  # type: ignore

        tmp = AUDIO_DIR / filename
        tmp.write_bytes(audio_bytes)
        model = WhisperModel("tiny", device="cpu")
        segments, info = model.transcribe(str(tmp))
        text = " ".join(s.text.strip() for s in segments).strip()
        return {"text": text, "engine": "faster-whisper", "language": info.language}
    except Exception as exc:
        return {"text": "", "engine": "error", "error": str(exc)}
