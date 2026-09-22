from fastapi import FastAPI, File, UploadFile

from ascs.speech.pipeline import transcribe

app = FastAPI(title="ASCS ASR")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/transcribe")
async def do_transcribe(file: UploadFile = File(...)):
    data = await file.read()
    return transcribe(data, file.filename or "audio.wav")
