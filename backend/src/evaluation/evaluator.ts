import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadSkills, loadTasks } from "../data/loaders.js";
import { SkillRouter } from "../router/skillRouter.js";
import { categoryMetrics, calculateMetrics, failureCases, type EvaluationRecord } from "./metrics.js";

export async function runEvaluation(
  k = 10,
  threshold = 0.45,
  taskPath?: string,
  outputPath = "evaluation-report.json"
) {
  const skills = await loadSkills();
  const tasks = await loadTasks(taskPath ? resolve(process.cwd(), taskPath) : undefined);
  const router = new SkillRouter(skills);
  const records: EvaluationRecord[] = [];

  for (const task of tasks) {
    const response = await router.route({ task: task.task, k, threshold });
    records.push({
      taskId: task.id,
      task: task.task,
      category: task.category,
      expectedSkills: task.expectedSkills,
      retrievedSkills: response.selectedSkills.map((skill) => skill.name)
    });
  }

  const report = {
    metrics: calculateMetrics(records),
    categoryMetrics: categoryMetrics(records),
    failureCases: failureCases(records),
    generatedAt: new Date().toISOString()
  };
  await writeFile(resolve(process.cwd(), outputPath), JSON.stringify(report, null, 2));
  return report;
}
