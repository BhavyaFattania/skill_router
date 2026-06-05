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

export interface RetrievedSkill {
  skill: Skill;
  denseScore: number;
  bm25Score: number;
  combinedScore: number;
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

export interface RouteRequest {
  task: string;
  k?: number;
  threshold?: number;
  installedSkillIds?: string[];
}
