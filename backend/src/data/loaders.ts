import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EvaluationTask, Skill } from "../types/index.js";

const root = process.cwd();

export async function loadSkills(path = resolve(root, "data/skills.json")): Promise<Skill[]> {
  const raw = JSON.parse(await readFile(path, "utf-8")) as Skill[];
  return raw.map((skill) => ({
    ...skill,
    id: skill.name,
    triggerConditions: skill.triggerConditions ?? [],
    examples: skill.examples ?? [],
    limitations: skill.limitations ?? [],
    keywords: skill.keywords ?? [],
    inputTypes: skill.inputTypes ?? [],
    outputTypes: skill.outputTypes ?? [],
    skillBody: skill.skillBody ?? []
  }));
}

interface RawTask {
  id: string;
  task?: string;
  query?: string;
  category: string;
  expectedSkills?: string[];
  relevantSkills?: string[];
  rationale: string;
  difficulty?: string;
}

export async function loadTasks(path = resolve(root, "data/tasks.json")): Promise<EvaluationTask[]> {
  const raw = JSON.parse(await readFile(path, "utf-8")) as RawTask[];
  return raw.map((task) => ({
    id: task.id,
    task: task.task ?? task.query ?? "",
    category: task.category,
    expectedSkills: task.expectedSkills ?? task.relevantSkills ?? [],
    rationale: task.rationale,
    difficulty: task.difficulty ?? task.category
  }));
}
