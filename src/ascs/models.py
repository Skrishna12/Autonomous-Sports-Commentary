from __future__ import annotations

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

from ascs.config import Settings

Base = declarative_base()


class Match(Base):
    __tablename__ = "matches"

    match_id = Column(String, primary_key=True)
    city = Column(String)
    venue = Column(String)
    dates = Column(JSON)
    match_type = Column(String)
    gender = Column(String)
    season = Column(String)
    team_type = Column(String)
    teams = Column(JSON)
    toss = Column(JSON)
    outcome = Column(JSON)
    event = Column(JSON)
    overs_limit = Column(Integer)
    balls_per_over = Column(Integer)
    player_of_match = Column(JSON)
    raw_info = Column(JSON)
    source_path = Column(String)


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("match_id", "player_name", name="uq_player_match"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), index=True)
    team = Column(String)
    player_name = Column(String)
    registry_id = Column(String)


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), index=True)
    innings = Column(Integer, index=True)
    batting_team = Column(String)
    over = Column(Integer)
    ball_in_over = Column(Integer)
    sequence = Column(Integer, index=True)
    actual_delivery = Column(String)
    batter = Column(String)
    bowler = Column(String)
    non_striker = Column(String)
    runs_batter = Column(Integer)
    runs_extras = Column(Integer)
    runs_total = Column(Integer)
    extras_type = Column(String)
    extras_json = Column(JSON)
    wicket_kind = Column(String)
    player_out = Column(String)
    fielders = Column(JSON)
    is_wicket = Column(Boolean, default=False)
    is_boundary = Column(Boolean, default=False)
    raw = Column(JSON)


class Partnership(Base):
    __tablename__ = "partnerships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String, ForeignKey("matches.match_id"), index=True)
    innings = Column(Integer)
    batting_team = Column(String)
    batter_1 = Column(String)
    batter_2 = Column(String)
    runs = Column(Integer)
    balls = Column(Integer)
    wicket_at_end = Column(Boolean)
    start_sequence = Column(Integer)
    end_sequence = Column(Integer)


class GameStateSnapshot(Base):
    __tablename__ = "game_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    match_id = Column(String, index=True)
    sequence = Column(Integer)
    state_json = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())


class CommentaryLine(Base):
    __tablename__ = "commentary_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    match_id = Column(String, index=True)
    sequence = Column(Integer)
    speaker = Column(String)
    language = Column(String)
    text = Column(Text)
    audio_path = Column(String)
    judge_accuracy = Column(Float)
    judge_fluency = Column(Float)
    judge_excitement = Column(Float)
    prompt_version = Column(String)
    model_name = Column(String)
    latency_ms = Column(Float)
    created_at = Column(DateTime, server_default=func.now())


class QATurn(Base):
    __tablename__ = "qa_turns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    match_id = Column(String, index=True)
    question = Column(Text)
    answer = Column(Text)
    language = Column(String)
    via_voice = Column(Boolean, default=False)
    latency_ms = Column(Float)
    created_at = Column(DateTime, server_default=func.now())


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    version = Column(String)
    body = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


def make_engine(url: str | None = None, settings: Settings | None = None):
    settings = settings or Settings()
    url = url or settings.database_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    engine = create_engine(url, future=True, connect_args=connect_args)
    return engine


def make_session_factory(engine=None, url: str | None = None):
    engine = engine or make_engine(url)
    return sessionmaker(bind=engine, expire_on_commit=False, future=True)


def init_db(engine=None, url: str | None = None):
    engine = engine or make_engine(url)
    Base.metadata.create_all(engine)
    return engine
