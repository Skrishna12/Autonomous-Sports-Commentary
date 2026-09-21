from ascs.speech.pipeline import synthetic_speech, synthesize


def test_synthetic_wav_header():
    audio = synthetic_speech("Four runs to Reddy.")
    assert audio[:4] == b"RIFF"
    assert b"WAVE" in audio[:12]
    out = synthesize("Dot ball.", "River Hale", "en")
    assert out["engine"] == "synthetic"
    assert out["path"].endswith(".wav")
