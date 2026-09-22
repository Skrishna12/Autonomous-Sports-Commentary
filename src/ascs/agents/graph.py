from __future__ import annotations

from typing import Any, Literal, TypedDict

from sqlalchemy.orm import Session

from ascs.agents.personas import ANALYST_PROMPT, PERSONAS, PLAY_BY_PLAY_PROMPT, PROMPT_VERSION, QA_PROMPT
from ascs.agents.templates import analyst_line, play_by_play, should_analyst_speak
from ascs.agents.rag import retrieve_deliveries
from ascs.agents.tools import batter_innings, bowler_innings
from ascs.config import get_settings
from ascs.replay.state import scorecard_view

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:  # pragma: no cover
    END = "END"
    START = "START"
    StateGraph = None  # type: ignore


class AgentState(TypedDict, total=False):
    event: dict[str, Any]
    game_state: dict[str, Any]
    language: str
    question: str
    route: Literal["commentary", "qa"]
    pbp_text: str
    analyst_text: str
    qa_answer: str
    speaker_pbp: str
    speaker_analyst: str
    tool_stats: dict[str, Any]
    prompt_version: str
    model_name: str


def _llm_complete(prompt: str) -> str | None:
    settings = get_settings()
    if not settings.llm_base_url:
        return None
    try:
        import httpx

        payload = {
            "model": settings.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        headers = {}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{settings.llm_base_url.rstrip('/')}/chat/completions", json=payload, headers=headers)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def _personas(language: str) -> dict[str, Any]:
    return PERSONAS.get(language, PERSONAS["en"])


def node_route(state: AgentState) -> AgentState:
    state["route"] = "qa" if state.get("question") else "commentary"
    state["prompt_version"] = PROMPT_VERSION
    settings = get_settings()
    state["model_name"] = settings.llm_model if settings.llm_base_url else "grounded-templates"
    return state


def node_tools(state: AgentState, session: Session | None) -> AgentState:
    event = state.get("event") or {}
    match_id = (state.get("game_state") or {}).get("match_id") or event.get("match_id")
    stats: dict[str, Any] = {}
    if session is not None and match_id:
        innings = event.get("innings")
        try:
            if event.get("batter"):
                stats["batter"] = batter_innings(session, match_id, event["batter"], innings)
            if event.get("bowler"):
                stats["bowler"] = bowler_innings(session, match_id, event["bowler"], innings)
            if state.get("question"):
                stats["retrieved"] = retrieve_deliveries(session, match_id, state["question"])
        except Exception:
            stats = {}
    state["tool_stats"] = stats
    return state


def node_pbp(state: AgentState) -> AgentState:
    language = state.get("language") or "en"
    personas = _personas(language)
    event = state["event"]
    card = scorecard_view(state["game_state"]) if "innings" in (state.get("game_state") or {}) else state.get("game_state") or {}
    prompt = PLAY_BY_PLAY_PROMPT.format(
        name=personas["play_by_play"]["name"],
        event=event,
        scorecard=card,
        language=language,
    )
    text = _llm_complete(prompt) or play_by_play(event, language)
    state["pbp_text"] = text
    state["speaker_pbp"] = personas["play_by_play"]["name"]
    return state


def node_analyst(state: AgentState) -> AgentState:
    language = state.get("language") or "en"
    personas = _personas(language)
    event = state["event"]
    if not should_analyst_speak(event, state.get("game_state") or {}):
        state["analyst_text"] = ""
        state["speaker_analyst"] = personas["analyst"]["name"]
        return state
    card = scorecard_view(state["game_state"]) if "innings" in (state.get("game_state") or {}) else state.get("game_state") or {}
    prompt = ANALYST_PROMPT.format(
        name=personas["analyst"]["name"],
        event=event,
        scorecard=card,
        tool_stats=state.get("tool_stats") or {},
        language=language,
    )
    text = _llm_complete(prompt) or analyst_line(event, card, state.get("tool_stats"), language)
    state["analyst_text"] = text
    state["speaker_analyst"] = personas["analyst"]["name"]
    return state


def node_qa(state: AgentState, session: Session | None) -> AgentState:
    from ascs.agents.qa import answer_question

    language = state.get("language") or "en"
    card = scorecard_view(state["game_state"]) if state.get("game_state") else {}
    prompt = QA_PROMPT.format(
        question=state.get("question"),
        scorecard=card,
        tool_stats=state.get("tool_stats") or {},
        language=language,
    )
    llm = _llm_complete(prompt)
    state["qa_answer"] = llm or answer_question(state.get("question") or "", card, session, card.get("match_id"))
    return state


def build_graph(session: Session | None = None):
    def tools(state: AgentState) -> AgentState:
        return node_tools(state, session)

    def qa(state: AgentState) -> AgentState:
        return node_qa(state, session)

    def branch(state: AgentState) -> str:
        return "qa" if state.get("route") == "qa" else "pbp"

    if StateGraph is None:
        return None

    graph = StateGraph(AgentState)
    graph.add_node("route", node_route)
    graph.add_node("tools", tools)
    graph.add_node("pbp", node_pbp)
    graph.add_node("analyst", node_analyst)
    graph.add_node("qa", qa)
    graph.add_edge(START, "route")
    graph.add_edge("route", "tools")
    graph.add_conditional_edges("tools", branch, {"qa": "qa", "pbp": "pbp"})
    graph.add_edge("pbp", "analyst")
    graph.add_edge("analyst", END)
    graph.add_edge("qa", END)
    return graph.compile()


class CommentarySupervisor:
    """LangGraph supervisor with a deterministic fallback if langgraph is missing."""

    def __init__(self, session: Session | None = None):
        self.session = session
        self.graph = build_graph(session)

    def invoke(self, payload: AgentState) -> AgentState:
        state: AgentState = dict(payload)
        if self.graph is not None:
            return self.graph.invoke(state)
        node_route(state)
        node_tools(state, self.session)
        if state.get("route") == "qa":
            node_qa(state, self.session)
            return state
        node_pbp(state)
        node_analyst(state)
        return state
