import { describe, expect, it } from "vitest";
import { retrieveSkills } from "../backend/src/retrieval/hybridRetriever.js";
import { applyThreshold, heuristicSelection } from "../backend/src/router/llmSelector.js";
import { calculateMetrics } from "../backend/src/evaluation/metrics.js";
import { DeterministicEmbeddingModel } from "../backend/src/indexing/embeddings.js";
import type { Skill } from "../backend/src/types/index.js";

const skills: Skill[] = [
  {
    id: "chart",
    name: "DataVisualizer",
    category: "Data",
    description: "Creates charts and plots from structured data.",
    triggerConditions: ["User asks for a chart", "User needs visualization"],
    examples: ["Create a bar chart from CSV"],
    limitations: [],
    keywords: ["chart", "plot", "visualization", "csv"],
    inputTypes: ["csv"],
    outputTypes: ["chart"],
    skillBody: ["Parse data", "Create visual summaries"]
  },
  {
    id: "translate",
    name: "LanguageTranslator",
    category: "Language",
    description: "Translates text between languages.",
    triggerConditions: ["User asks to translate text"],
    examples: ["Translate English to German"],
    limitations: [],
    keywords: ["translate", "language", "German"],
    inputTypes: ["text"],
    outputTypes: ["translation"],
    skillBody: ["Detect source language", "Translate faithfully"]
  },
  {
    id: "code",
    name: "CodeExecutor",
    category: "Developer",
    description: "Runs code and returns output.",
    triggerConditions: ["User asks to execute a script"],
    examples: ["Run this Python script"],
    limitations: [],
    keywords: ["run", "execute", "script", "python"],
    inputTypes: ["code"],
    outputTypes: ["stdout"],
    skillBody: ["Execute code in a sandbox", "Return logs"]
  }
];

describe("hybrid retrieval", () => {
  it("retrieves relevant skills", async () => {
    const results = await retrieveSkills("Create a bar chart from a CSV file", skills, 2, {
      useLanceDb: false,
      embeddingModel: new DeterministicEmbeddingModel()
    });
    expect(results[0].skill.name).toBe("DataVisualizer");
  });

  it("respects installed skill filtering input", async () => {
    const installed = skills.filter((skill) => skill.id !== "chart");
    const results = await retrieveSkills("Create a bar chart from a CSV file", installed, 3, {
      useLanceDb: false,
      embeddingModel: new DeterministicEmbeddingModel()
    });
    expect(results.map((result) => result.skill.name)).not.toContain("DataVisualizer");
  });
});

describe("selection and thresholding", () => {
  it("filters low confidence no-skill results", () => {
    const result = applyThreshold({ selectedSkills: ["DataVisualizer"], confidence: 0.2, reasoning: "" }, 0.5);
    expect(result.selectedSkills).toEqual([]);
  });

  it("can select multiple plausible skills", () => {
    const selected = heuristicSelection("Run the script and chart the CSV output", [
      { skill: skills[0], denseScore: 0.8, bm25Score: 0.8, combinedScore: 0.8 },
      { skill: skills[2], denseScore: 0.75, bm25Score: 0.75, combinedScore: 0.75 }
    ]);
    expect(selected.selectedSkills).toEqual(["DataVisualizer", "CodeExecutor"]);
  });
});

describe("evaluation metrics", () => {
  it("calculates recall, precision, and MRR", () => {
    const metrics = calculateMetrics([
      {
        taskId: "1",
        task: "chart",
        category: "Easy",
        expectedSkills: ["DataVisualizer"],
        retrievedSkills: ["DataVisualizer", "LanguageTranslator"]
      }
    ]);
    expect(metrics.recallAtK).toBe(1);
    expect(metrics.precisionAtK).toBe(0.5);
    expect(metrics.mrr).toBe(1);
  });

  it("rewards no-skill detection", () => {
    const metrics = calculateMetrics([
      { taskId: "2", task: "irrelevant", category: "No-Skill", expectedSkills: [], retrievedSkills: [] }
    ]);
    expect(metrics.recallAtK).toBe(1);
    expect(metrics.precisionAtK).toBe(1);
  });
});
