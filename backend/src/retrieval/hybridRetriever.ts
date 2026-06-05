import { buildSkillDocuments } from "../indexing/documentBuilder.js";
import { OpenRouterEmbeddingModel, type EmbeddingModel } from "../indexing/embeddings.js";
import { LanceSkillStore } from "../indexing/lancedb.js";
import type { RetrievedSkill, Skill } from "../types/index.js";
import { Bm25Index } from "./bm25.js";

export interface HybridRetrieverOptions {
  embeddingModel: EmbeddingModel;
  useLanceDb: boolean;
}

const defaultOptions: HybridRetrieverOptions = {
  embeddingModel: new OpenRouterEmbeddingModel(),
  useLanceDb: true
};

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  const norm = normA * normB;
  return norm === 0 ? 0 : dot / norm;
}

export async function retrieveSkills(
  task: string,
  installedSkills: Skill[],
  k = 10,
  options: Partial<HybridRetrieverOptions> = {}
): Promise<RetrievedSkill[]> {
  // Return early if no skills are enabled
  if (!installedSkills || installedSkills.length === 0) {
    return [];
  }

  const config = {
    ...defaultOptions,
    ...options
  };

  const documents = buildSkillDocuments(installedSkills);
  
  // 1. Calculate BM25 Sparse Scores
  const rawBm25Scores = new Bm25Index(documents.map((document) => document.text)).scores(task);
  const bm25ScoreMap = new Map(documents.map((doc, i) => [doc.id, rawBm25Scores[i]]));
  
  // 2. Calculate Dense Vector Scores
  let denseScores = new Map<string, number>();

  if (config.useLanceDb) {
    try {
      const store = new LanceSkillStore(config.embeddingModel);
      denseScores = await store.query(
        task,
        installedSkills.length,
        installedSkills.map(s => s.id)
      );
    } catch (e) {
      console.warn("LanceDB query failed, falling back to in-memory dense similarity scoring:", e);
      denseScores = await inMemoryDenseScores(task, documents, config.embeddingModel);
    }
  } else {
    denseScores = await inMemoryDenseScores(task, documents, config.embeddingModel);
  }

  // 3. Combine using Reciprocal Rank Fusion (RRF)
  const rrfConstant = 60;
  
  // Rank dense (top 100)
  const denseRanked = [...denseScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  const denseRanks = new Map(denseRanked.map(([id], i) => [id, i + 1]));

  // Rank bm25 (top 100)
  const bm25Ranked = [...bm25ScoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
  const bm25Ranks = new Map(bm25Ranked.map(([id], i) => [id, i + 1]));

  // Union candidates only
  const candidateIds = new Set([
    ...denseRanks.keys(),
    ...bm25Ranks.keys()
  ]);

  return [...candidateIds]
    .map((id) => {
      const dr = denseRanks.get(id);
      const br = bm25Ranks.get(id);
      
      const rrfScore = 
        (dr ? 1 / (rrfConstant + dr) : 0) + 
        (br ? 1 / (rrfConstant + br) : 0);
      
      const document = documents.find(d => d.id === id)!;
      return {
        skill: document.skill,
        denseScore: denseScores.get(id) ?? 0,
        bm25Score: bm25ScoreMap.get(id) ?? 0,
        combinedScore: Number(rrfScore.toFixed(6))
      };
    })
    .sort((left, right) => right.combinedScore - left.combinedScore)
    .slice(0, k);
}

async function inMemoryDenseScores(
  task: string,
  documents: ReturnType<typeof buildSkillDocuments>,
  embeddingModel: EmbeddingModel
): Promise<Map<string, number>> {
  try {
    const embeddings = await embeddingModel.embed([task, ...documents.map((document) => document.text)]);
    const queryEmbedding = embeddings[0];
    if (!queryEmbedding) return new Map();

    const similarities = documents.map((document, index) => {
      const docEmbedding = embeddings[index + 1] ?? [];
      return {
        id: document.id,
        score: Math.max(0, cosineSimilarity(queryEmbedding, docEmbedding))
      };
    });
    return new Map(similarities.map((item) => [item.id, item.score]));
  } catch (e) {
    console.error("InMemory dense scoring crashed:", e);
    return new Map();
  }
}
