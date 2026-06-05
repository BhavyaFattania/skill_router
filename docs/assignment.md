Take-Home Assignment: Skill Router for AI Agents
Context
Modern AI agents come with many skills installed — discrete capabilities like "create a PowerPoint," "query a SQL database," or "fill a PDF form." Each skill carries metadata (name, description, trigger conditions) that must sit in the model's context for the agent to know the skill exists. As installed skills grow into the dozens or hundreds, loading all of them becomes expensive: it burns the context budget and dilutes the agent's attention.

We want a skill router: given a user's task, it returns the small set of skills most relevant to that task, so the agent loads only what it needs.

Note the asymmetry that makes this more interesting than plain search — a false negative (failing to surface a skill the agent needed) means the agent silently can't do something it actually could, while a false positive (surfacing an irrelevant skill) just wastes some context. These costs are not equal, and a good router should reflect that.
Your goal
Build a working skill router, construct a dataset to evaluate it on, and show us how well it works and where it breaks. We value clear thinking, sound judgment, and a clean runnable solution far above any leaderboard score.
Time expectation
Scoped as a weekend project. We'd rather see a focused, well-reasoned system with honest evaluation than a sprawling one. The documentation we ask for below is meant to be lightweight — substance over ceremony. Don't spend your weekend formatting; spend it thinking.

Please return your submission within 3–4 days of receiving this. With AI tools doing the heavy lifting, this is a realistic window — we're keeping it tight on purpose. If life gets in the way, just tell us; we care about the work, not the clock to the minute.


Tech stack (required)
The project must be written in TypeScript end to end. The frontend (Part 4) must use React + Tailwind CSS. You may use any other libraries you like.

You have no restrictions on AI tool usage — use Claude, Copilot, Cursor, whatever you want, as much as you want. We're genuinely interested in how you work with these tools, not in whether you can avoid them.

For retrieval, you must use a local, in-process vector store — something lightweight that runs as part of your app with no external service or hosted database to stand up. Which library you choose is your call; justify it in an ADR (see below).


Part 1 — Build a dataset (graded, not busywork)
Construct your own evaluation dataset of skills and tasks. We're deliberately not handing you one, because deciding what a good dataset looks like is part of the problem.

Aim for roughly 20–40 skills with realistic names and descriptions, and a set of tasks each labeled with the relevant skill(s). Crucially, include hard cases:

tasks where two skills look superficially similar but only one fits;
tasks needing multiple skills;
tasks where the right skill isn't named by any obvious keyword;
tasks where no installed skill is relevant at all.

In your README, explain how you decided relevance labels and where the judgment calls were genuinely ambiguous. We look closely here — an easy dataset that hides your router's weaknesses counts against you.


Part 2 — Build the router
Implement a routing function — roughly route(task, skills, k) — that returns the top-k skills ranked by relevance, backed by your local vector store.

Handle the edge cases that follow naturally from the problem: ties, an empty skill set, and especially the "no skill is relevant" case — the router should be able to say nothing here fits rather than always returning its k best guesses.

Expose a way for the caller to reflect the false-negative/false-positive asymmetry (for example, a tunable threshold or a confidence signal) and explain your design.


Part 3 — Evaluate honestly
Report at least one quantitative metric over your dataset (e.g. recall@k, MRR) and, more importantly, discuss where it fails and why. We trust a candidate who shows us their router's blind spots far more than one who reports a single high number with no failure analysis.


Part 4 — Build a local dashboard
Build a small local, dev-only web UI (React + Tailwind CSS, talking to your router over a real API) that lets a tester drive the system interactively. No auth, no deployment, no production polish — this should test that you can wire a frontend to a backend cleanly and round-trip state, not your CSS craftsmanship.

It should let the tester:

Send a prompt (task) and see the routed skills come back, ranked, with their relevance scores or confidence signals shown.
Browse the skill catalog and install / uninstall skills — i.e. toggle which skills are in the active set. The router only routes among installed skills, so the tester can watch results change as the installed set changes.
Tweak parameters live — at minimum k and your relevance threshold — and immediately see how the results respond, including the "nothing here fits" case when the threshold filters everything out.

We're looking for a clean client/server boundary, sensible state management, and a UI that makes the router's behavior legible — a tester should be able to build intuition for the router by playing with it. Make the false-negative / false-positive tradeoff something they can feel by moving a slider.


Required documentation
Keep all three of these lightweight and honest.

README — gets us from clone to running in a few commands (both the router and the dashboard), plus your approach, assumptions, and tradeoffs.

AI usage log (AI_USAGE.md) — records where and why you used AI: what you delegated, what you verified yourself, and honestly, where you were learning something new (e.g. TypeScript or the vector store) versus where you already knew the ground. We treat heavy, well-directed AI use as a positive; the log is about how you direct it, not a confession.

ADR file (docs/adr.md, or one file per decision) — captures the handful of real architectural decisions you made — vector store choice, how you represent skills, your relevance/threshold strategy — each as a few sentences: the decision, the alternatives, and why. An ADR is meant to be terse; a paragraph per decision is plenty.


Submission
Host the repo open-source on your own GitHub account and send us the link. Include a short note (half a page) on what you'd build with another week.

Also record a short walkthrough video (Loom, or an unlisted YouTube link) of 5–10 minutes — a plain screen recording, no editing expected. Use it to:

give a quick live demo of the dashboard: send a prompt, show the routed skills, toggle a skill's installed state, and move the threshold/k so we see the results (and the "nothing fits" case) respond;
walk us through one routing decision and explain why the router ranked things the way it did;
call out the parts you found hard, the tradeoffs you made, and anything you'd do differently.

We're listening for genuine understanding of what you built — talk us through the why, not just the what.


What we evaluate
Problem understanding and the quality of your assumptions
Dataset design, especially your hard cases and labeling judgment
Code clarity and structure
Honest, informative evaluation
Fullstack execution — a clean client/server boundary and a dashboard that makes the router's behavior legible and tunable
How thoughtfully you direct AI tools
Clear communication across your docs and your walkthrough video — can you explain why, not just what

We explicitly do not reward over-engineering — a clean, well-justified simple system beats a clever sprawling one.


