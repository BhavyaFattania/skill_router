import type { EvaluationMetrics, FailureCase } from "../types/index.js";

export interface EvaluationRecord {
  taskId: string;
  task: string;
  category: string;
  expectedSkills: string[];
  retrievedSkills: string[];
}

export function calculateMetrics(records: EvaluationRecord[]): EvaluationMetrics {
  const totals = records.reduce(
    (acc, record) => {
      const expected = new Set(record.expectedSkills);
      const retrieved = record.retrievedSkills;
      const hits = retrieved.filter((skill) => expected.has(skill));
      acc.recall += expected.size === 0 ? (retrieved.length === 0 ? 1 : 0) : hits.length / expected.size;
      acc.precision += retrieved.length === 0 ? (expected.size === 0 ? 1 : 0) : hits.length / retrieved.length;
      const firstHit = retrieved.findIndex((skill) => expected.has(skill));
      acc.mrr += expected.size === 0 ? (retrieved.length === 0 ? 1 : 0) : firstHit >= 0 ? 1 / (firstHit + 1) : 0;
      return acc;
    },
    { recall: 0, precision: 0, mrr: 0 }
  );
  const count = Math.max(records.length, 1);
  return {
    recallAtK: totals.recall / count,
    precisionAtK: totals.precision / count,
    mrr: totals.mrr / count
  };
}

export function categoryMetrics(records: EvaluationRecord[]): Record<string, EvaluationMetrics> {
  const groups = new Map<string, EvaluationRecord[]>();
  for (const record of records) groups.set(record.category, [...(groups.get(record.category) ?? []), record]);
  return Object.fromEntries([...groups.entries()].map(([category, group]) => [category, calculateMetrics(group)]));
}

export function failureCases(records: EvaluationRecord[], limit = 10): FailureCase[] {
  return records
    .map((record) => {
      const retrieved = new Set(record.retrievedSkills);
      const expected = new Set(record.expectedSkills);
      const missingSkills = record.expectedSkills.filter((skill) => !retrieved.has(skill));
      const falsePositives = record.retrievedSkills.filter((skill) => !expected.has(skill));
      const hasFailure = missingSkills.length > 0 || falsePositives.length > 0;
      const reasons: string[] = [];
      if (missingSkills.length > 0) reasons.push("Expected skill was not retrieved or selected.");
      if (falsePositives.length > 0) reasons.push("False positive skills were retrieved or selected.");

      return {
        taskId: record.taskId,
        task: record.task,
        category: record.category,
        expectedSkills: record.expectedSkills,
        retrievedSkills: record.retrievedSkills,
        missingSkills,
        reason: hasFailure ? reasons.join(" AND ") : "No failure."
      };
    })
    .filter((failure) => failure.reason !== "No failure.")
    .slice(0, limit);
}
