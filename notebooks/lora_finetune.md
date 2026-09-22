# Optional stretch: LoRA commentary style (after the core path is green)

Do **not** start this until ETL → replay → agents → speech → Streamlit → deploy → monitor already work end to end.

1. Build `event → commentary` pairs from Cricsheet events plus **SoccerNet-Echoes** (CC BY 4.0) for style only. Do not scrape copyrighted cricket commentary.
2. Fine-tune a 1.7B–4B open-weight model (Qwen3-1.7B / Qwen3-4B) with LoRA on SageMaker or a local GPU.
3. Compare judge scores vs the grounded template / base instruct model in MLflow.
4. Gate promotion: factual accuracy must stay ≥ 95%. Style gains cannot buy hallucinations.

This repository does not ship trained weights.
