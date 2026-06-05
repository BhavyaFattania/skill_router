import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import * as lancedb from "@lancedb/lancedb";
import { env } from "../config/env.js";
import type { SkillDocument } from "../types/index.js";
import type { EmbeddingModel } from "./embeddings.js";

interface LanceSkillRow extends Record<string, unknown> {
  id: string;
  vector: number[];
  text: string;
  name: string;
  category: string;
}

interface LanceQueryRow extends LanceSkillRow {
  _distance?: number;
}

export class LanceSkillStore {
  private readonly dbPath: string;

  constructor(
    private readonly embeddingModel: EmbeddingModel,
    private readonly tableName = env.lanceDbTable,
    dbPath = env.lanceDbPath
  ) {
    this.dbPath = resolve(process.cwd(), dbPath);
  }

  async recreateIndex(documents: SkillDocument[]): Promise<void> {
    await mkdir(this.dbPath, { recursive: true });
    const db = await lancedb.connect(this.dbPath);
    const embeddings = await this.embeddingModel.embed(documents.map((document) => document.text));
    const rows: LanceSkillRow[] = documents.map((document, index) => ({
      id: document.id,
      vector: embeddings[index],
      text: document.text,
      name: document.skill.name,
      category: document.skill.category
    }));
    await db.createTable(this.tableName, rows, { mode: "overwrite" });
  }

  async query(text: string, k: number, installedSkillIds?: string[]): Promise<Map<string, number>> {
    const db = await lancedb.connect(this.dbPath);
    const table = await db.openTable(this.tableName);
    const [embedding] = await this.embeddingModel.embed([text]);
    
    let queryBuilder = table.query().nearestTo(embedding).column("vector").distanceType("cosine");
    
    if (installedSkillIds !== undefined && installedSkillIds.length > 0) {
      queryBuilder = queryBuilder.filter(`id IN (${installedSkillIds.map(id => `'${id}'`).join(', ')})`);
    } else if (installedSkillIds !== undefined && installedSkillIds.length === 0) {
      return new Map<string, number>();
    }

    const startSearch = Date.now();
    const rows = (await queryBuilder
      .limit(k)
      .select(["id", "_distance"])
      .toArray()) as LanceQueryRow[];
    const latencySearch = Date.now() - startSearch;
    console.log(`[Metrics] LanceDB vector search completed in ${latencySearch} ms`);

    const scores = new Map<string, number>();
    for (const row of rows) {
      const distance = row._distance ?? 1;
      scores.set(row.id, Math.max(0, 1 - distance));
    }
    return scores;
  }
}
