import type { Skill, SkillDocument } from "../types/index.js";

function section(label: string, values: string[] | string): string {
  const content = Array.isArray(values) ? values.join("\n- ") : values;
  return `${label}:\n${Array.isArray(values) && values.length > 0 ? "- " : ""}${content}`;
}

export function buildSkillDocuments(skills: Skill[]): SkillDocument[] {
  return skills.map((skill) => ({
    id: skill.id,
    skill,
    text: [
      section("Name", skill.name),
      section("Category", skill.category),
      section("Description", skill.description),
      section("Trigger Conditions", skill.triggerConditions),
      section("Examples", skill.examples),
      section("Limitations", skill.limitations),
      section("Keywords", skill.keywords),
      section("Input Types", skill.inputTypes),
      section("Output Types", skill.outputTypes),
      section("Skill Body", skill.skillBody)
    ].join("\n\n")
  }));
}
