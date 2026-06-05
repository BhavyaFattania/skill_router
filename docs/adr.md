# Architecture Decision Records

---

## ADR-01: Vector Store — LanceDB

**Decision:** Use LanceDB as the vector store.

**Alternatives I looked at:**
- `vectra` — simple TypeScript library, but no hybrid search
- `hnswlib-node` — fast, but sparse search not supported
- `chromadb` — needs a separate server running, which wasn't allowed

**Why LanceDB:**
It runs inside the app with no external service. It supports dense retrieval. Retrieval on 51 skills takes about 3ms.

---

## ADR-02: Skill Schema — Why I Used More Than Just Name + Description

**Decision:** Each skill has these fields: `skillName`, `skillDescription`, `triggerConditions`, `examples`, `inputTypes`, `outputTypes`, `limitations`, `skillBody`.

**What I started with:** Just name and description. It didn't work well enough.

**Why I changed it:**
The research paper I read made one thing clear — the name and description alone don't carry enough information for good routing. The useful stuff is in the examples and trigger conditions. A user saying "I need to hand off this codebase to a new contractor" doesn't say "GitHubRepoAnalyzer" anywhere. The router only makes that connection if the skill's text contains words about onboarding and documentation.

**Tradeoff:** More fields means bigger chunks in the store. Fine at 50 skills. At 500+ skills, each skill would probably need to be split into multiple indexed pieces.

---

## ADR-03: Two-Step Routing — Vector Search First, Then LLM

**Decision:** Step 1: vector search returns the top-k candidate skills. Step 2: an LLM looks at just those candidates and picks the final answer.

**Alternatives:**
- Vector search only, with a score threshold — simpler, but too many wrong calls on ambiguous tasks
- LLM looking at all skills directly — the LLM context gets too large, which is the exact problem this router is trying to solve

**Why two steps:**
The LLM always receives the same amount of text regardless of how many skills are installed. With k=10, it gets about 1500 tokens per call. That stays constant whether there are 50 skills or 500.

Vector search narrows the field. The LLM makes the final judgment. Neither works as well alone.

**Tradeoff:** Two network calls per routing request. Total latency is around 5 seconds. Fine for agents running overnight jobs. Would need local models for anything real-time.

---

## ADR-04: Hybrid Search — Dense + Sparse, Combined with RRF

**Decision:** Combine dense vector search (cosine similarity) with sparse keyword search (BM25). Merge the results using Reciprocal Rank Fusion (RRF).

**Why hybrid:**
Dense search misses cases where the user uses exact words that appear in a skill. Sparse search misses cases where the meaning is similar but the words are different. Using both covers more ground.

**Why RRF instead of a weighted average:**
BM25 scores are much larger numbers than cosine similarity scores (which are 0 to 1). If you just add them together with weights, BM25 dominates. Min-max normalization worked but was sensitive to outliers. RRF only looks at rank positions, not the actual score values, so it doesn't have this problem. I tested both and RRF gave more consistent results.

BM25 is computed fresh each time the app runs — takes 2–3ms. At current scale that's fine.

---

## ADR-05: Embedding Model — OpenAI via OpenRouter

**Decision:** Use OpenAI's embedding model through OpenRouter.

**What I tested:** smaller models like all-MiniLM and BGE variants, also available on OpenRouter.

**Why OpenAI:**
The smaller models were actually slower on OpenRouter than OpenAI's model. Not because they're less capable — because fewer people use them on OpenRouter, so those endpoints are less warm. OpenAI's embedding endpoint responded faster in practice.

`transformers.js` runs models on CPU only. Given the TypeScript constraint, I couldn't use Python's GPU-accelerated version. Running a local Python embedding server as a sidecar would have been better, but that felt out of scope.

**What I'd do in production:** Run a BGE model locally in a small Python server. The TypeScript backend calls it at `localhost:8001/embed`. No external API dependency, about 50ms latency.

---

## ADR-06: LLM for Skill Selection — Qwen 3.5 Flash

**Decision:** Use Qwen 3.5 Flash via OpenRouter for the final skill selection step.

**What I tried first:** Llama 3.1 8B — it kept producing broken JSON. The selection step needs structured output with skill names and confidence scores. Llama 3.1 8B failed at that too often.

**Why Qwen 3.5 Flash:**
It's a recent model, handles structured output reliably, and has good throughput on OpenRouter. Fast enough, cheap enough.

**For production:** A smaller Qwen model running locally via Ollama. The task is simple enough — pick from a short list and output JSON — that a small local model can handle it.

---

## ADR-07: Confidence Threshold and the No-Skill Case

**Decision:** The LLM gives each selected skill a confidence score from 0.0 to 1.0. Skills below the threshold (default 0.45) are dropped. If nothing clears the threshold, the router returns nothing — it doesn't force a pick.

**Why a threshold:**
The router needs to be able to say "nothing here fits." Without a threshold, it always returns something even when the task has nothing to do with any installed skill. That's worse than returning nothing.

**Why 0.45 as the default:**
After looking at the failure cases manually: real matches were almost always scoring above 0.6, wrong suggestions were usually below 0.5. The 0.45 floor filters out the clear noise without cutting off borderline-but-real matches.

**Why it's tunable:**
The assignment pointed out that missing a skill is worse than returning an extra one. A lower threshold means fewer misses but more irrelevant results. A higher threshold means cleaner results but more misses. Different agents have different tolerances for this, so the threshold is exposed as a parameter instead of being hardcoded.

**One honest caveat:** The confidence score the LLM outputs is not a real probability. 0.7 doesn't mean 70% chance of being correct. It's just a soft signal. The threshold is a sensitivity dial, not a statistical cutoff.
