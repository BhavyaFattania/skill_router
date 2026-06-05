# AI Usage Log

## Tools I used
- **ChatGPT** — brainstorming, reading a research paper together
- **Claude** — generating the task dataset
- **Codex** — writing the initial project code
- **Antigravity** — fixing bugs after the project was running


---

## What I actually did with each tool

**ChatGPT**

I found a research paper on skill routing on GitHub. I fed it to ChatGPT and talked through what it was saying. The key thing I took from that paper: routing with just a skill name and description is not enough. Most of the useful information lives in what the skill actually does — its examples, its triggers, its edge cases. I read the paper myself too, I didn't just take ChatGPT's word for it.

After that I came up with the idea of a richer skill schema. ChatGPT helped me think through it but the decision was mine.

**Claude**

I used Claude to generate the tasks dataset. Multiple sessions, multiple accounts, roughly 400 tasks generated in total. I then manually went through them and kept 180 for the final submission.

The standard tasks were straightforward — give Claude the skill list, ask for tasks at different difficulty levels.

The 30 special tasks were different. I'd read that thinking models respond better to questions than instructions. So instead of saying "generate hard tasks," I asked Claude things like: where would the router fail? What kinds of prompts have words that don't match any skill name? That produced much harder, more realistic cases.

I checked every task label myself. Claude wrote the task text. I decided what skills each task actually needs.

**Codex**

I gave Codex the full architecture plan and it scaffolded the whole project. It worked but had bugs — wrong fields being passed between layers, the LLM getting too much context, score normalization missing. The project ran but several things were wrong.

**Antigravity**

I listed the bugs I found from using the app and reading the code. Antigravity fixed them. I reviewed each fix before accepting it, I didn't just accept everything.


---

## What I did myself vs. what AI did

| Area | Who did it |
|------|-----------|
| Skill schema design | Me |
| Task ground truth labels | Me |
| Choosing RRF over min-max normalization | Me, tested both |
| Finding the context size bug | Me, via Langfuse |
| Initial code | Codex |
| Bug fixes | Antigravity, reviewed by me |
| Task text generation | Claude |
| Research paper reading | Me + ChatGPT |

---

## Where I was learning vs. where I already knew things

**Was learning:**
- TypeScript. I work in Python normally. I relied on AI more here than I usually would.
- LanceDB. Never used it before. Read the docs, used Codex to get the first integration working, then adjusted it myself.

**Already knew:**
- How RAG pipelines work, hybrid retrieval, embedding model tradeoffs
- Evaluation metrics and what they mean in practice
- Agentic system design, LangGraph patterns
- How LLM output format depends a lot on which model you pick

---

## Honest note

The dataset design and routing logic are the parts I'm most confident in — those are genuine decisions, not AI output. The TypeScript scaffold I leaned on AI more, and I'd be slower to modify that code under pressure compared to equivalent Python.

The evaluation numbers are real. I kept the hard cases in the dataset even when they showed the router failing. The failure analysis section exists because I looked for failures, not because they were hard to hide.