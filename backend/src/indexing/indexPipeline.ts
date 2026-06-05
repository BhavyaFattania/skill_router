import { loadSkills } from "../data/loaders.js";
import { buildSkillDocuments } from "./documentBuilder.js";
import { OpenRouterEmbeddingModel, type EmbeddingModel } from "./embeddings.js";
import { LanceSkillStore } from "./lancedb.js";

export async function createVectorIndex(embeddingModel: EmbeddingModel = new OpenRouterEmbeddingModel()): Promise<number> {
  const skills = await loadSkills();
  const documents = buildSkillDocuments(skills);
  const store = new LanceSkillStore(embeddingModel);
  await store.recreateIndex(documents);
  return documents.length;
}

export { buildSkillDocuments };

export async function embedSkillDocuments(embeddingModel: EmbeddingModel = new OpenRouterEmbeddingModel()) {
  const documents = buildSkillDocuments(await loadSkills());
  const embeddings = await embeddingModel.embed(documents.map((document) => document.text));
  return documents.map((document, index) => ({ document, embedding: embeddings[index] }));
}
