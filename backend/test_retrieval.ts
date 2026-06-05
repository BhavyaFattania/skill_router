import { retrieveSkills } from "./src/retrieval/hybridRetriever.js";
import { Skill } from "./src/types/index.js";

const mockSkills: Skill[] = [
  { id: "1", name: "Weather", description: "Get weather", category: "Utility" },
  { id: "2", name: "Stocks", description: "Get stock prices", category: "Finance" }
];

async function run() {
  const retrieved = await retrieveSkills("Tell me a joke", mockSkills, 2, { useLanceDb: false });
  console.log("Retrieved:", retrieved.map(r => ({ name: r.skill.name, score: r.combinedScore })));
}

run().catch(console.error);
