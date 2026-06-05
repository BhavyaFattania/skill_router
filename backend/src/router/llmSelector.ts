import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CallbackHandler } from "langfuse-langchain";
import { env } from "../config/env.js";
import type { LlmSelectionResult, RetrievedSkill } from "../types/index.js";

export interface SkillSelector {
  select(task: string, candidates: RetrievedSkill[]): Promise<LlmSelectionResult>;
}

export class OpenRouterSkillSelector implements SkillSelector {
  private readonly model: ChatOpenAI | undefined;

  constructor() {
    this.model = env.openRouterApiKey
      ? new ChatOpenAI({
          apiKey: env.openRouterApiKey,
          model: env.openRouterModel,
          temperature: 0,
          configuration: {
            baseURL: env.openRouterBaseUrl,
            defaultHeaders: {
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "Skill Router"
            }
          }
        })
      : undefined;
  }

  async select(task: string, candidates: RetrievedSkill[]): Promise<LlmSelectionResult> {
    if (candidates.length === 0) {
      return {
        selectedSkills: [],
        confidence: 0,
        reasoning: "No candidate skills were retrieved by the RAG layer."
      };
    }

    if (!this.model) {
      return heuristicSelection(task, candidates);
    }

    const candidatePayload = candidates.map(({ skill }) => ({
      name: skill.name,
      description: skill.description,
      limitations: skill.limitations,
      inputTypes: skill.inputTypes,
      outputTypes: skill.outputTypes
    }));

    try {
      const callbacks = [];
      if (env.langfusePublicKey && env.langfuseSecretKey) {
        const langfuseHandler = new CallbackHandler({
          publicKey: env.langfusePublicKey,
          secretKey: env.langfuseSecretKey,
          baseUrl: env.langfuseBaseUrl
        });
        callbacks.push(langfuseHandler);
      }

      const llmStart = Date.now();
      const response = await this.model.invoke([
        new SystemMessage(
          `You are a strict, precise AI Skill Router. Your job is to select the correct skills needed to solve the user's task.
          
You must evaluate the user task against the candidate skills provided.
- Only select a skill if it matches the task input/output requirements, keywords, or triggers.
- Do not force a match if no skills are relevant.
- You can select multiple skills if they are all necessary.
- WebResearchSummarizer is for deep synthesis/market analysis of a topic. Do NOT select WebResearchSummarizer for general knowledge Q&A or simple factual lookups (e.g., "What is the capital of Argentina?"). General knowledge Q&A should result in NO selected skills.
- If the user task specifies reading or extracting text from a PDF, you MUST select "PDFReader" as part of the selected skills.

You MUST respond with a single valid JSON object containing exactly these keys:
{
  "selectedSkills": ["Skill Name 1", "Skill Name 2"], // EXACT skill name matching a candidate skill name
  "confidence": 0.95, // float between 0.0 and 1.0 reflecting your confidence in the selection
  "reasoning": "Detailed explanation of why you selected these skills or why no skills matched."
}

DO NOT output any conversational text, code comments, or wrapping HTML. Just return the raw JSON object.`
        ),
        new HumanMessage(`User Task:\n"${task}"\n\nCandidate skills list:\n${JSON.stringify(candidatePayload, null, 2)}`)
      ], { callbacks });

      const llmLatency = Date.now() - llmStart;
      console.log(`[Metrics] LLM skill generation took ${llmLatency} ms`);
      
      const parsed = parseSelection(String(response.content));
      console.log(`[Metrics] LLM Full Response:
  Raw Content: ${String(response.content).trim().replace(/\n/g, ' ')}
  Extracted Confidence: ${parsed.confidence}
  Selected Skills: ${parsed.selectedSkills.join(", ")}`);
      
      return parsed;
    } catch (e) {
      console.warn("OpenRouter API call failed. Using local heuristic fallback.", e);
      return heuristicSelection(task, candidates);
    }
  }
}

export function applyThreshold(result: LlmSelectionResult, threshold: number): LlmSelectionResult {
  if (result.confidence < threshold) {
    return {
      selectedSkills: [],
      confidence: result.confidence,
      reasoning: `Filtered by threshold (Score ${result.confidence.toFixed(2)} < ${threshold.toFixed(2)}). Reasoning: ${result.reasoning}`
    };
  }
  return result;
}

function parseSelection(content: string): LlmSelectionResult {
  try {
    // 1. Strip markdown fences if present
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      const match = jsonText.match(/```(?:json)?([\s\S]*?)```/);
      if (match && match[1]) {
        jsonText = match[1].trim();
      }
    }

    // 2. Extract first matching outer curly brackets block if there is surrounding garbage text
    if (!jsonText.startsWith("{") || !jsonText.endsWith("}")) {
      const bracketMatch = jsonText.match(/\{[\s\S]*\}/);
      if (bracketMatch) {
        jsonText = bracketMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText) as Partial<LlmSelectionResult>;
    return {
      selectedSkills: Array.isArray(parsed.selectedSkills) ? parsed.selectedSkills.map(s => String(s).trim()) : [],
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "Successfully parsed LLM response."
    };
  } catch (error) {
    console.warn("Failed to parse LLM response. Raw response was:", content);
    return {
      selectedSkills: [],
      confidence: 0,
      reasoning: `Failed to parse LLM response as JSON. Original response length: ${content.length}`
    };
  }
}

/**
 * A highly improved keyword-matching semantic heuristic selector
 * simulating dynamic routing when the LLM API is unavailable.
 */
export function heuristicSelection(task: string, candidates: RetrievedSkill[]): LlmSelectionResult {
  const taskLower = task.toLowerCase();
  const matchedSkills: string[] = [];
  const debugLogs: string[] = [];

  // Sort candidates by combined RAG scores
  const sortedCandidates = [...candidates].sort((a, b) => b.combinedScore - a.combinedScore);

  for (const cand of sortedCandidates) {
    const skill = cand.skill;
    const name = skill.name.toLowerCase();
    const desc = skill.description.toLowerCase();
    const keywords = (skill.keywords ?? []).map(k => k.toLowerCase());
    const triggers = (skill.triggerConditions ?? []).map(t => t.toLowerCase());

    // 1. Check direct name match
    const nameMatch = taskLower.includes(name);

    // 2. Check keyword matches
    const matchingKeywords = keywords.filter(keyword => {
      // Avoid tiny sub-word matching, match word boundary
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(taskLower);
    });

    // 3. Check trigger condition matches
    const matchingTriggers = triggers.filter(trigger => {
      // Look for overlapping sub-words
      const triggerWords = trigger.split(/\s+/).filter(w => w.length > 3);
      return triggerWords.some(word => taskLower.includes(word));
    });

    // Determine relevance score
    let relevanceScore = 0;
    if (nameMatch) relevanceScore += 0.8;
    relevanceScore += (matchingKeywords.length * 0.25);
    relevanceScore += (matchingTriggers.length * 0.15);
    if (cand.combinedScore >= 0.5) relevanceScore += 0.2; // RAG boost

    if (relevanceScore >= 0.4) {
      matchedSkills.push(skill.name);
      debugLogs.push(
        `"${skill.name}" matched (Keywords: [${matchingKeywords.join(", ")}], Triggers matched: ${matchingTriggers.length > 0})`
      );
    }
  }

  // Determine final confidence
  let confidence = 0;
  let reasoning = "";

  if (matchedSkills.length > 0) {
    // Take the average of matched skills' combined RAG scores
    const matchedRAGScores = sortedCandidates
      .filter(c => matchedSkills.includes(c.skill.name))
      .map(c => c.combinedScore);
    const avgScore = matchedRAGScores.reduce((a, b) => a + b, 0) / Math.max(matchedRAGScores.length, 1);
    
    confidence = Number(Math.min(0.95, Math.max(0.45, avgScore + 0.1)).toFixed(2));
    reasoning = `[Heuristic Fallback] Selected skills based on keyword matching: ${debugLogs.join("; ")}`;
  } else {
    // If no keyword matches, select the top candidate if it has a very high RAG score
    const topCandidate = sortedCandidates[0];
    if (topCandidate && topCandidate.combinedScore >= 0.65) {
      matchedSkills.push(topCandidate.skill.name);
      confidence = Number(topCandidate.combinedScore.toFixed(2));
      reasoning = `[Heuristic Fallback] No keywords matched, but selected top candidate "${topCandidate.skill.name}" due to strong semantic query similarity (${score(topCandidate.combinedScore)}).`;
    } else {
      confidence = 0.25;
      reasoning = "[Heuristic Fallback] No skills matched keyword patterns or met minimum similarity requirements.";
    }
  }

  return {
    selectedSkills: matchedSkills,
    confidence,
    reasoning
  };
}

function score(val: number) {
  return val.toFixed(3);
}
