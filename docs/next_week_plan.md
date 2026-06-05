# What I'd Build Next Week

---

## 1. Move the Embedding Model to a Local Python Server

Right now the embedding calls go to OpenRouter. That adds network latency every time.

The plan is to run a small Python FastAPI server locally that loads a BGE model and serves it at `localhost:8001/embed`. The TypeScript backend just calls that instead of the external API. Embedding latency drops from ~1.4 seconds to about 50ms because the model runs on GPU locally.

If that goes well, I'd evaluate whether to rebuild the whole backend in Python. Python has better library support for this kind of work (LangChain, transformers, FAISS all have more mature Python versions). The only reason the project is in TypeScript is the assignment constraint.

---

## 2. Improve the Skill Descriptions

After running evaluation and looking at the failure cases, the skill descriptions are not detailed enough. Some skills appeared in the top-k retrieved results but the LLM still didn't pick them. That usually means the description didn't give the LLM enough to work with.

The fix is to write longer, more specific skill bodies — taking inspiration from how Claude's own skills marketplace describes capabilities. Right now the average skill body is a handful of bullet points. It should be closer to 100+ tokens with concrete examples, edge cases, and what kind of tasks it should NOT handle.

This matters more as the skill library grows. Better descriptions mean the right chunks float to the top-k and the LLM has enough context to make a confident decision.

---

## 3. Store the Sparse Embeddings Instead of Recomputing Every Time

Right now BM25 sparse embeddings are generated fresh each time the app starts. At 51 skills this takes 2–3ms, which is fine.

Once the skill count grows past a few hundred, that will add up. The next step is to persist the sparse index to disk and load it on startup instead of recomputing it.

---

## 4. Add Intent Patterns to All Skills

This field is what closes the vocabulary gap. A user saying "I need something that takes transaction objects and computes rolling averages" should match `CodeGenerator` even though none of those words appear in the skill name. Intent patterns are how you make that connection.

The plan is to go through all 51 skills and write 8–10 realistic intent patterns for each, including implicit phrasing (things a user would actually say, not just descriptions of the skill).
example of intent patterns for a skill 

```python
codeGenerator skill 

"intentPatterns": [
    "I need a function that does X",
    "build me something that takes X and returns Y",
    "implement the logic for computing Z",
    "a utility that reads X and outputs Y",
    "write the code to do X",
    "I want a script that processes X",
    "generate a class that models X",
    "I need the implementation for X",
    "create a helper that handles X",
    "something that computes X from Y"
  ],
```

---

## 5. Plug the Router Into LangChain as Middleware

Right now the router is a standalone service. The practical next step is to integrate it into a LangChain agent as middleware using the `agentMiddleware` class. Every time the agent receives a task, the router runs first and loads only the relevant skills into the agent's context. The agent never sees the full skill catalog.

For short and medium length conversations, this middleware approach works well — low overhead, transparent to the agent.

For long autonomous agents (overnight research runs, multi-step workflows), a different pattern makes more sense: expose the router itself as a tool. The agent calls it like any other skill, passing in what it's trying to do, and gets back a list of skills it can use. This is more flexible for agents that need to plan multiple steps ahead and load different skills at different stages.

---

## 6. Switch to a Smaller Local LLM for Skill Selection

Qwen 3.5 Flash on OpenRouter works but it's an external API call. For production the goal is to run a model locally via Ollama — something recent, under 8B parameters, that handles structured JSON output reliably.

The selection task is simple enough that a small model can do it. The main requirement is that it doesn't break JSON formatting, which was the problem with Llama 3.1 8B. Newer Qwen models in the 3–7B range are the first thing I'd test.