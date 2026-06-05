import { createVectorIndex } from "./indexPipeline.js";

const count = await createVectorIndex();
console.log(`Indexed ${count} skill documents in LanceDB.`);
