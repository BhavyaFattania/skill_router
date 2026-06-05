import { useEffect, useState } from "react";
import { fetchSkills } from "../api/client";
import type { Skill } from "../types";

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [installedSkillIds, setInstalledSkillIds] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetchSkills()
      .then((loadedSkills) => {
        setSkills(loadedSkills);
        setInstalledSkillIds(loadedSkills.map((skill) => skill.id));
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);

  return { skills, installedSkillIds, setInstalledSkillIds, error };
}
