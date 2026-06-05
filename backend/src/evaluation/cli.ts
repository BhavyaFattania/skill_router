import { runEvaluation } from "./evaluator.js";

const isSpecial = process.argv.includes("--special");
const taskPath = isSpecial ? "data/special_tasks.json" : undefined;
const outputPath = isSpecial ? "special-evaluation-report.json" : "evaluation-report.json";

const report = await runEvaluation(10, 0.45, taskPath, outputPath);
console.log(JSON.stringify(report.metrics, null, 2));
