import "dotenv/config";

export const env = {
  lanceDbPath: process.env.LANCEDB_PATH ?? ".lancedb",
  lanceDbTable: process.env.LANCEDB_TABLE ?? "skills",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "baai/bge-base-en-v1.5",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct",
  openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL ?? "nomic-ai/nomic-embed-text-v1.5",
  defaultThreshold: Number(process.env.ROUTER_THRESHOLD ?? 0.45),
  port: Number(process.env.PORT ?? 3001),
  langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY,
  langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY,
  langfuseBaseUrl: process.env.LANGFUSE_BASEURL ?? "https://cloud.langfuse.com"
};
