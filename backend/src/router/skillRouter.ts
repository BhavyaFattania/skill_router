import { env } from "../config/env.js";
import { retrieveSkills } from "../retrieval/hybridRetriever.js";
import type { RouteRequest, RouteResponse, Skill } from "../types/index.js";
import { applyThreshold, OpenRouterSkillSelector, type SkillSelector } from "./llmSelector.js";

export class SkillRouter {
  constructor(
    private readonly skills: Skill[],
    private readonly selector: SkillSelector = new OpenRouterSkillSelector()
  ) {}

  async route(request: RouteRequest): Promise<RouteResponse> {
    const totalStart = Date.now();

    if (request.threshold !== undefined && request.threshold > 1.0) {
      return {
        retrievedSkills: [],
        selectedSkills: [],
        confidence: 0,
        reasoning: "Threshold is out of bounds (> 1.0).",
        metrics: {
          retrievalLatencyMs: 0,
          llmLatencyMs: 0,
          totalLatencyMs: Date.now() - totalStart
        }
      };
    }

    // 1. Filter active/enabled skills
    const installedSkills = request.installedSkillIds !== undefined
      ? this.skills.filter((skill) => request.installedSkillIds?.includes(skill.id))
      : this.skills;

    // 2. Execute Hybrid Retrieval and time it
    const retrievalStart = Date.now();
    const retrievedSkills = await retrieveSkills(
      request.task,
      installedSkills,
      request.k ?? 10
    );
    const retrievalLatencyMs = Date.now() - retrievalStart;

    // 3. Execute LLM Selector and time it
    const llmStart = Date.now();
    const rawSelection = await this.selector.select(request.task, retrievedSkills);
    const selection = applyThreshold(
      rawSelection,
      request.threshold ?? env.defaultThreshold
    );
    const llmLatencyMs = Date.now() - llmStart;

    // 4. Resolve selected skill names/ids to Skill objects
    const normalizedSelected = new Set(
      (Array.isArray(selection.selectedSkills) ? selection.selectedSkills : [])
        .map((s) => String(s).trim().toLowerCase())
    );

    const selectedSkills = retrievedSkills
      .map((r) => r.skill)
      .filter(
        (skill) =>
          normalizedSelected.has(String(skill.name).trim().toLowerCase()) ||
          normalizedSelected.has(String(skill.id).trim().toLowerCase())
      );

    const totalLatencyMs = Date.now() - totalStart;

    return {
      retrievedSkills,
      selectedSkills,
      confidence: selection.confidence,
      reasoning: selection.reasoning,
      metrics: {
        retrievalLatencyMs,
        llmLatencyMs,
        totalLatencyMs
      }
    };
  }
}
