from __future__ import annotations


def word_error_rate(reference: str, hypothesis: str) -> float:
    ref = reference.lower().split()
    hyp = hypothesis.lower().split()
    if not ref:
        return 0.0 if not hyp else 1.0
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[n][m] / n


def fixture_wer() -> dict[str, float]:
    """Labeled viewer-question pairs for ASR scoring when Whisper is enabled."""
    pairs = [
        ("what is the score", "what is the score"),
        ("who is batting", "who is batting"),
        ("how many runs has reddy scored", "how many runs has ready scored"),
    ]
    wers = [word_error_rate(r, h) for r, h in pairs]
    return {"n": len(pairs), "mean_wer": sum(wers) / len(wers), "pairs": list(zip(pairs, wers))}
