export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  triggerConditions: string[];
  examples: string[];
  limitations: string[];
  keywords: string[];
  inputTypes: string[];
  outputTypes: string[];
  skillBody: string[];
}

export interface EvaluationTask {
  id: string;
  task: string;
  category: string;
  expectedSkills: string[];
  rationale: string;
  difficulty: string;
}

export interface SkillDocument {
  id: string;
  skill: Skill;
  text: string;
}

export interface RetrievedSkill {
  skill: Skill;
  denseScore: number;
  bm25Score: number;
  combinedScore: number;
}

export interface LlmSelectionResult {
  selectedSkills: string[];
  confidence: number;
  reasoning: string;
}

export interface RouteRequest {
  task: string;
  k?: number;
  threshold?: number;
  installedSkillIds?: string[];
}

export interface RouteResponse {
  retrievedSkills: RetrievedSkill[];
  selectedSkills: Skill[];
  confidence: number;
  reasoning: string;
  metrics?: {
    retrievalLatencyMs: number;
    llmLatencyMs: number;
    totalLatencyMs: number;
  };
}

export interface EvaluationMetrics {
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
}

export interface FailureCase {
  taskId: string;
  task: string;
  category: string;
  expectedSkills: string[];
  retrievedSkills: string[];
  missingSkills: string[];
  reason: string;
}
