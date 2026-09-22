# Architecture

```mermaid
flowchart LR
  subgraph ingest [Ingest]
    CS[Cricsheet JSON]
    S3[S3 raw]
    Glue[Glue / local ETL]
    RDS[(Postgres RDS)]
    PQ[Parquet on S3]
  end
  subgraph live [Live replay]
    RE[Replay engine]
    GS[Game state store]
  end
  subgraph agents [LangGraph supervisor]
    PBP[Play-by-play River Hale]
    AN[Analyst Nia Voss]
    QA[Q and A desk]
    MCP[MCP-style SQL tools]
  end
  subgraph speech [Speech]
    TTS[Kokoro / Indic TTS]
    ASR[faster-whisper]
  end
  subgraph app [Platform]
    API[FastAPI]
    UI[Streamlit]
    PROM[Prometheus]
    GRAF[Grafana]
    MLF[MLflow]
  end
  CS --> S3 --> Glue --> RDS
  Glue --> PQ
  RDS --> RE --> GS
  GS --> PBP --> TTS --> UI
  GS --> AN
  MCP --> RDS
  AN --> MCP
  QA --> MCP
  UI -->|text/voice| ASR --> QA --> TTS
  API --> PROM --> GRAF
  PBP --> MLF
```

## Data flow
1. Cricsheet match JSON lands in `data/raw` (and S3 `raw/` when configured).
2. ETL flattens nested innings/overs/deliveries into relational tables and Parquet.
3. The replay engine applies one delivery every N seconds and writes `game_state`.
4. The supervisor routes the event to play-by-play (always) and analyst (wicket, boundary, or end of over).
5. Viewer questions go to the Q&A node, which may call read-only SQL tools.
6. TTS speaks commentary and answers; Whisper transcribes microphone input.
7. Judge scores and prompt versions are logged to MLflow before prompt changes.

## Personas
Original voices only: **River Hale** (English play-by-play), **Nia Voss** (English analyst), **Arjun Mehta** / **Kavya Natarajan** (Hindi/Tamil). No cloned broadcasters.
