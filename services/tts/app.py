from fastapi import FastAPI
from pydantic import BaseModel

from ascs.speech.pipeline import synthesize

app = FastAPI(title="ASCS TTS")


class SpeakIn(BaseModel):
    text: str
    speaker: str = "River Hale"
    language: str = "en"


@app.get("/health")
def health():
    return {"ok": True, "engine": "kokoro-or-synthetic"}


@app.post("/speak")
def speak(body: SpeakIn):
    result = synthesize(body.text, body.speaker, body.language)
    return {"path": result["path"], "engine": result["engine"]}
