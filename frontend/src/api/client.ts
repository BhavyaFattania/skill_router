import type { RouteRequest, RouteResponse, Skill } from "../types";

export async function fetchSkills(): Promise<Skill[]> {
  const response = await fetch("/api/skills");
  if (!response.ok) throw new Error("Failed to load skills");
  return response.json() as Promise<Skill[]>;
}

export async function routeTask(input: RouteRequest): Promise<RouteResponse> {
  const response = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
    throw new Error(body?.error ?? "Failed to route task");
  }
  return response.json() as Promise<RouteResponse>;
}
