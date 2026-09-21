import os
import time

import httpx
import streamlit as st

API = os.environ.get("STREAMLIT_API_URL", "http://127.0.0.1:8000")

st.set_page_config(page_title="Autonomous Sports Commentary", layout="wide")
st.title("Autonomous Sports Commentary")
st.caption("Two original AI commentators · live stats · text and voice Q&A")


@st.cache_data(ttl=15)
def list_matches():
    r = httpx.get(f"{API}/matches", timeout=10)
    r.raise_for_status()
    return r.json()


matches = []
try:
    matches = list_matches()
except Exception as exc:
    st.error(f"API is not reachable at {API}: {exc}")
    st.stop()

col_a, col_b, col_c = st.columns([2, 1, 1])
with col_a:
    labels = {f"{m['match_id']} — {' vs '.join(m.get('teams') or [])}": m["match_id"] for m in matches}
    choice = st.selectbox("Cricsheet match", list(labels) or ["(run ascs bootstrap)"])
    match_id = labels.get(choice, "")
with col_b:
    language = st.selectbox("Language", ["en", "hi", "ta"])
with col_c:
    interval = st.slider("Seconds per ball", 1.0, 8.0, 3.0)

if "session_id" not in st.session_state:
    st.session_state.session_id = None

c1, c2, c3 = st.columns(3)
if c1.button("Start replay", type="primary") and match_id:
    r = httpx.post(
        f"{API}/replay/start",
        json={"match_id": match_id, "interval_seconds": interval, "language": language},
        timeout=30,
    )
    r.raise_for_status()
    st.session_state.session_id = r.json()["session_id"]
if c2.button("Pause") and st.session_state.session_id:
    httpx.post(f"{API}/replay/{st.session_state.session_id}/pause", params={"paused": True}, timeout=10)
if c3.button("Resume") and st.session_state.session_id:
    httpx.post(f"{API}/replay/{st.session_state.session_id}/pause", params={"paused": False}, timeout=10)

session_id = st.session_state.session_id
if not session_id:
    st.info("Start a replay to open the live scorecard, commentary feed, and chat.")
    st.stop()

state = httpx.get(f"{API}/replay/{session_id}/state", timeout=10).json()
card = state.get("scorecard") or {}
progress = state.get("cursor", 0) / max(state.get("total", 1), 1)
st.progress(progress, text=f"Ball {state.get('cursor')} / {state.get('total')}")

left, right = st.columns([1.2, 1])
with left:
    innings = card.get("innings") or []
    for inn in innings:
        if inn.get("runs") is None:
            continue
        st.subheader(f"{inn.get('team')}  {inn.get('runs')}/{inn.get('wickets')}  ({inn.get('overs')})")
        st.caption(f"Striker {inn.get('striker')} · Non-striker {inn.get('non_striker')} · Bowler {inn.get('current_bowler')}")
        batters = inn.get("batters") or []
        if batters:
            st.dataframe(batters, hide_index=True, use_container_width=True)
    if card.get("required_run_rate") is not None:
        st.metric("Required run rate", card["required_run_rate"])

with right:
    st.subheader("Live commentary")
    for line in reversed(state.get("commentary") or []):
        st.markdown(f"**{line.get('speaker')}** — {line.get('text')}")
        if line.get("audio_path"):
            audio_url = f"{API}/audio?path={line['audio_path']}"
            st.audio(audio_url)

st.divider()
st.subheader("Ask about the match")
qcol, vcol = st.columns([2, 1])
with qcol:
    question = st.text_input("Text question", placeholder="What is the score?")
    if st.button("Ask") and question:
        r = httpx.post(
            f"{API}/qa",
            json={"session_id": session_id, "question": question, "language": language},
            timeout=30,
        )
        data = r.json()
        st.success(data.get("answer"))
        if data.get("audio_path"):
            st.audio(f"{API}/audio?path={data['audio_path']}")
with vcol:
    clip = st.audio_input("Voice question")
    if clip is not None and st.button("Transcribe & ask"):
        files = {"file": ("question.wav", clip.getvalue(), "audio/wav")}
        r = httpx.post(
            f"{API}/qa/voice",
            params={"session_id": session_id, "language": language},
            files=files,
            timeout=60,
        )
        data = r.json()
        st.write("Heard:", data.get("asr", {}).get("text"))
        st.success(data.get("answer"))
        if data.get("audio_path"):
            st.audio(f"{API}/audio?path={data['audio_path']}")

time.sleep(2)
st.rerun()
