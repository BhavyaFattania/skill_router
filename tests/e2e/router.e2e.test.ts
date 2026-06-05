import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.resolve(__dirname, "../../skill_router_eval_dataset.json");
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf-8"));

// Filters
const getTasks = (category: string, limit: number) => {
  return dataset.filter((t: any) => t.category === category).slice(0, limit);
};

const easyTasks = getTasks("Easy", 5);
const noSkillTasks = getTasks("No-Skill", 5);
const similarSkillTasks = getTasks("Similar-Skill Confusion", 5);
const hiddenIntentTasks = getTasks("Hidden-Intent", 5);
const multiSkillTasks = getTasks("Multi-Skill", 5);

let baseUrl: string;
let server: any;

describe("Skill Router E2E Tests", { timeout: 40000 }, () => {
  beforeAll(async () => {
    process.env.PORT = "0"; // Use random available port
    const serverModule = await import("../../backend/src/api/server.js");
    server = serverModule.server;
    
    // Server is already listening because it's at the top level of server.ts
    const address = server.address();
    if (address && typeof address === "object") {
      baseUrl = `http://localhost:${address.port}`;
    } else {
      baseUrl = `http://localhost:3001`; // fallback
    }
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  const sendRouteRequest = async (payload: any) => {
    const response = await fetch(`${baseUrl}/api/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response;
  };

  describe("Tier 1: Core Features", () => {
    describe("High-recall candidate generation & Semantic LLM routing", () => {
      it.each(easyTasks)("should route Easy task correctly: $id", async (...args: any[]) => {
        const task = args[0];
        const response = await sendRouteRequest({ task: task.query });
        expect(response.status).toBe(200);
        const data = await response.json();
        
        expect(data).toHaveProperty("selectedSkills");
        expect(Array.isArray(data.selectedSkills)).toBe(true);
        expect(data).toHaveProperty("retrievedSkills");
        
        const expectedSkills = task.relevantSkills;
        const selectedIds = data.selectedSkills.map((s: any) => s.id);
        
        for (const expected of expectedSkills) {
          expect(selectedIds).toContain(expected);
        }
      });

      it.each(noSkillTasks)("should return empty for No-Skill task: $id", async (...args: any[]) => {
        const task = args[0];
        const response = await sendRouteRequest({ task: task.query });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.selectedSkills.length).toBe(0);
      });
    });

    describe("Thresholding control", () => {
      it("should return more or equal skills when threshold is lower", async () => {
        const taskText = "Write a blog post and schedule it on my calendar";
        
        const respHigh = await sendRouteRequest({ task: taskText, threshold: 0.9, k: 5 });
        const dataHigh = await respHigh.json();
        
        const respLow = await sendRouteRequest({ task: taskText, threshold: 0.1, k: 5 });
        const dataLow = await respLow.json();
        
        expect(dataLow.selectedSkills.length).toBeGreaterThan(0);
        expect(dataLow.selectedSkills.length).toBeGreaterThanOrEqual(dataHigh.selectedSkills.length);
      });

      it("should limit candidate generation when k is small", async () => {
        const taskText = "Analyze this spreadsheet and create a chart";
        const response = await sendRouteRequest({ task: taskText, k: 1 });
        const data = await response.json();
        expect(data.retrievedSkills.length).toBeGreaterThan(0);
        expect(data.retrievedSkills.length).toBe(1);
      });

      it("should return no selected skills if threshold is extremely high", async () => {
        const taskText = "Analyze this spreadsheet and create a chart";
        const response = await sendRouteRequest({ task: taskText, threshold: 0.99, k: 5 });
        const data = await response.json();
        expect(data.selectedSkills.length).toBe(0);
      });

      it("should return multiple selected skills if threshold is extremely low", async () => {
        const taskText = "Write a blog post and schedule it on my calendar";
        const response = await sendRouteRequest({ task: taskText, threshold: 0.01, k: 5 });
        const data = await response.json();
        expect(data.selectedSkills.length).toBeGreaterThan(1);
      });

      it("should respect both k and threshold for selected skills", async () => {
        const taskText = "Write a blog post and schedule it on my calendar";
        const response = await sendRouteRequest({ task: taskText, threshold: 0.1, k: 2 });
        const data = await response.json();
        expect(data.selectedSkills.length).toBeGreaterThan(0);
        expect(data.selectedSkills.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("Tier 2: Edge Cases", () => {
    describe("Direct mappings", () => {
      const directMappingTasks = [
        { task: "Run this Python script and show me the output.", expected: "CodeExecutor" },
        { task: "Translate this paragraph from English to German.", expected: "LanguageTranslator" },
        { task: "Create a bar chart showing monthly revenue by product category from this CSV.", expected: "DataVisualizer" },
        { task: "Write a user story for a two-factor authentication feature including acceptance criteria.", expected: "UserStoryWriter" },
        { task: "Fill in this W-9 tax form PDF with the contractor's information.", expected: "PDFFormFiller" }
      ];

      it.each(directMappingTasks)("should directly map '$task' to $expected", async ({ task, expected }) => {
        const response = await sendRouteRequest({ task, k: 5 });
        expect(response.status).toBe(200);
        const data = await response.json();
        const selectedIds = data.selectedSkills.map((s: any) => s.id);
        expect(selectedIds.length).toBeGreaterThan(0);
        expect(selectedIds).toContain(expected);
      });
    });

    describe("Similar-skill confusion", () => {
      it.each(similarSkillTasks)("should distinguish similar skills for: $id", async (...args: any[]) => {
        const task = args[0];
        const response = await sendRouteRequest({ task: task.query });
        const data = await response.json();
        
        const selectedIds = data.selectedSkills.map((s: any) => s.id);
        expect(selectedIds.length).toBe(task.relevantSkills.length);
        for (const expected of task.relevantSkills) {
          expect(selectedIds).toContain(expected);
        }
      });
    });

    describe("Hidden-intent", () => {
      it.each(hiddenIntentTasks)("should detect hidden intent for: $id", async (...args: any[]) => {
        const task = args[0];
        const response = await sendRouteRequest({ task: task.query });
        const data = await response.json();
        
        const selectedIds = data.selectedSkills.map((s: any) => s.id);
        for (const expected of task.relevantSkills) {
          expect(selectedIds).toContain(expected);
        }
      });
    });

    describe("Multi-skill tasks", () => {
      it.each(multiSkillTasks)("should identify multiple skills for: $id", async (...args: any[]) => {
        const task = args[0];
        const response = await sendRouteRequest({ task: task.query });
        const data = await response.json();
        
        const selectedIds = data.selectedSkills.map((s: any) => s.id);
        for (const expected of task.relevantSkills) {
          expect(selectedIds).toContain(expected);
        }
      });
    });

    describe("Boundary Values", () => {
      it("should handle k=0 gracefully", async () => {
        const response = await sendRouteRequest({ task: "test", k: 0 });
        const data = await response.json();
        expect(data.retrievedSkills.length).toBe(0);
      });

      it("should handle exceptionally large k gracefully", async () => {
        const response = await sendRouteRequest({ task: "test", k: 1000 });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.retrievedSkills.length).toBeLessThan(1000);
      });

      it("should handle threshold=0.0 gracefully", async () => {
        const response = await sendRouteRequest({ task: "test", threshold: 0.0 });
        expect(response.status).toBe(200);
      });

      it("should handle threshold=1.0 gracefully", async () => {
        const response = await sendRouteRequest({ task: "test", threshold: 1.0 });
        expect(response.status).toBe(200);
      });

      it("should handle threshold=1.1 gracefully (out of bounds)", async () => {
        const response = await sendRouteRequest({ task: "test", threshold: 1.1 });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.retrievedSkills.length).toBe(0); // Assuming 1.1 threshold means no skills qualify
      });

      it("should return 400 for empty task", async () => {
        const response = await sendRouteRequest({ task: "   " });
        expect(response.status).toBe(400);
      });

      it("should return 400 for missing task", async () => {
        const response = await fetch(`${baseUrl}/api/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(response.status).toBe(400);
      });

      it("should handle massive task gracefully", async () => {
        const massiveTask = "test ".repeat(10000); // 50k chars
        const response = await sendRouteRequest({ task: massiveTask });
        expect([200, 413]).toContain(response.status);
      });
    });
  });

  describe("Tier 3: Pairwise Combinations", () => {
    const pairwiseCombinations = [
      { k: 2, threshold: 0.1, installed: ["DataVisualizer", "OtherSkill"] },
      { k: 2, threshold: 0.9, installed: ["DataVisualizer"] },
      { k: 2, threshold: 0.5, installed: [] },
      { k: 5, threshold: 0.1, installed: ["DataVisualizer"] },
      { k: 5, threshold: 0.9, installed: [] },
      { k: 5, threshold: 0.5, installed: ["DataVisualizer", "OtherSkill"] },
      { k: 10, threshold: 0.1, installed: [] },
      { k: 10, threshold: 0.9, installed: ["DataVisualizer", "OtherSkill"] },
      { k: 10, threshold: 0.5, installed: ["DataVisualizer"] },
    ];

    it.each(pairwiseCombinations)("should process k=$k, threshold=$threshold, installed=$installed", async ({ k, threshold, installed }) => {
      const response = await sendRouteRequest({ 
        task: "Create a bar chart showing monthly revenue", 
        k, 
        threshold,
        installedSkillIds: installed
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      if (installed.length === 0) {
        expect(data.retrievedSkills.length).toBe(0);
        expect(data.selectedSkills.length).toBe(0);
      } else {
        const retrievedIds = data.retrievedSkills.map((s: any) => s.skill.id);
        for (const id of retrievedIds) {
          expect(installed).toContain(id);
        }
      }
      expect(data.retrievedSkills.length).toBeLessThanOrEqual(k);
    });
  });

  describe("Tier 4: Real-world Scenarios", () => {
    const realWorldTasks = [
      "User: I need to write an email to the client.\nBot: I can help. What should it say?\nUser: Tell them the project is delayed by 2 weeks because of the API issue.",
      "Step 1: Check my calendar for tomorrow.\nStep 2: If there's an opening at 2pm, schedule a meeting with Bob.",
      "Summarize the attached PDF and then email the summary to the engineering list.",
      "Hey, the site is down, I am seeing a 502 error on the checkout page.",
      "I want to compare our Q1 revenue against Q2, generate a chart, and put it in a Word doc."
    ];

    it.each(realWorldTasks)("should process real-world scenario gracefully: %s", async (scenario) => {
      const response = await sendRouteRequest({ task: scenario });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("selectedSkills");
      expect(Array.isArray(data.selectedSkills)).toBe(true);
    });
  });
});
