import cors from "cors";
import express from "express";
import { env } from "../config/env.js";
import { loadSkills } from "../data/loaders.js";
import { runEvaluation } from "../evaluation/evaluator.js";
import { createVectorIndex } from "../indexing/indexPipeline.js";
import { SkillRouter } from "../router/skillRouter.js";
import type { RouteRequest } from "../types/index.js";

const skills = await loadSkills();
const router = new SkillRouter(skills);
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Simple request logging middleware
app.use((request, _response, next) => {
  if (request.path !== "/api/health") {
    console.log(`[HTTP] ${request.method} ${request.path}`);
  }
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/skills", (_request, response) => {
  response.json(skills);
});

app.post("/api/route", async (request, response, next) => {
  try {
    const body = request.body as RouteRequest;
    if (!body.task?.trim()) {
      response.status(400).json({ error: "task is required" });
      return;
    }
    
    console.log(`[Router] Routing query: "${body.task.slice(0, 60)}${body.task.length > 60 ? '...' : ''}"`);
    const routeResult = await router.route(body);
    
    const selectedList = routeResult.selectedSkills.map(s => s.name).join(", ") || "None";
    const retrievalTime = routeResult.metrics?.retrievalLatencyMs ?? 0;
    const llmTime = routeResult.metrics?.llmLatencyMs ?? 0;
    const totalTime = routeResult.metrics?.totalLatencyMs ?? 0;
    
    console.log(`[Router] Selected: [${selectedList}] (Conf: ${Math.round(routeResult.confidence * 100)}%)`);
    console.log(`[Router] Performance: RAG ${retrievalTime}ms | LLM ${llmTime}ms | Total ${totalTime}ms`);
    
    response.json(routeResult);
  } catch (error) {
    console.error(`[Router] Routing failed:`, error);
    next(error);
  }
});

app.post("/api/evaluate", async (request, response, next) => {
  try {
    const body = request.body as { k?: number; threshold?: number };
    console.log(`[Evaluation] Starting evaluation run (K=${body.k ?? 10}, Threshold=${body.threshold ?? 0.45})`);
    const report = await runEvaluation(body.k, body.threshold);
    console.log(`[Evaluation] Completed. Recall@K: ${report.metrics.recallAtK.toFixed(4)}, Precision: ${report.metrics.precisionAtK.toFixed(4)}`);
    response.json(report);
  } catch (error) {
    console.error(`[Evaluation] Run failed:`, error);
    next(error);
  }
});

app.post("/api/index", async (_request, response, next) => {
  try {
    console.log("[Index] Recreating vector index table in LanceDB...");
    const count = await createVectorIndex();
    console.log(`[Index] Re-indexing complete. ${count} documents added.`);
    response.json({ indexed: count });
  } catch (error) {
    console.error("[Index] Re-indexing failed:", error);
    next(error);
  }
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(500).json({ error: error.message });
});

export const server = app.listen(env.port, () => {
  console.log(`\n======================================================`);
  console.log(`Skill Router API listening on http://localhost:${env.port}`);
  console.log(`======================================================\n`);
});

export { app };
