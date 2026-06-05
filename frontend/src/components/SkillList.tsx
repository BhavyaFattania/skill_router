import { useState, useMemo } from "react";
import { Search, ToggleLeft, ToggleRight, Grid, Filter, CheckSquare, Square } from "lucide-react";
import type { Skill } from "../types";

interface Props {
  skills: Skill[];
  installedSkillIds: string[];
  onChange: (ids: string[]) => void;
}

export function SkillList({ skills, installedSkillIds, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const installed = useMemo(() => new Set(installedSkillIds), [installedSkillIds]);

  // Extract unique categories dynamically
  const categories = useMemo(() => {
    const cats = new Set(skills.map(s => s.category));
    return ["all", ...Array.from(cats)];
  }, [skills]);

  // Filter skills based on search query and selected category
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const matchesSearch = 
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase()) ||
        skill.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || skill.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [skills, search, selectedCategory]);

  const handleToggle = (skillId: string) => {
    if (installed.has(skillId)) {
      onChange(installedSkillIds.filter((id) => id !== skillId));
    } else {
      onChange([...installedSkillIds, skillId]);
    }
  };

  const enableAllFiltered = () => {
    const filteredIds = filteredSkills.map(s => s.id);
    const newInstalled = Array.from(new Set([...installedSkillIds, ...filteredIds]));
    onChange(newInstalled);
  };

  const disableAllFiltered = () => {
    const filteredIdsSet = new Set(filteredSkills.map(s => s.id));
    onChange(installedSkillIds.filter(id => !filteredIdsSet.has(id)));
  };

  // Get color for category badge
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "data": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "visualization": return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      case "file": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "text": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "analysis": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <aside className="flex flex-col h-full bg-[#0a0f14] border-r border-white/5 overflow-hidden">
      {/* Sidebar Header */}
      <div className="border-b border-white/5 px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-white">Skills Inventory</h2>
          </div>
          <span className="text-[11px] font-semibold bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/25">
            {installed.size} of {skills.length} active
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111720]/80 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 transition-all"
          />
        </div>
      </div>

      {/* Category Filter Horizontal Scroll */}
      <div className="px-6 py-2 border-b border-white/5 bg-[#080c10] flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0 transition-all ${
              selectedCategory === cat
                ? "bg-violet-600 text-white border-violet-500/50 shadow-md shadow-violet-600/15"
                : "bg-[#111720]/60 text-slate-400 border-white/5 hover:border-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bulk Enable/Disable actions */}
      <div className="px-6 py-2 bg-[#0c1218]/40 border-b border-white/5 flex items-center justify-between text-[11px] shrink-0">
        <span className="text-slate-500 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Filtered: {filteredSkills.length}
        </span>
        <div className="flex gap-3 font-semibold">
          <button 
            onClick={enableAllFiltered}
            className="text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1"
          >
            <CheckSquare className="h-3 w-3" />
            Enable All
          </button>
          <button 
            onClick={disableAllFiltered}
            className="text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1"
          >
            <Square className="h-3 w-3" />
            Disable All
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No skills match your filters.
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isInstalled = installed.has(skill.id);
            return (
              <div
                key={skill.id}
                onClick={() => handleToggle(skill.id)}
                className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-200 select-none ${
                  isInstalled
                    ? "bg-[#111720] border-violet-500/20 hover:border-violet-500/40"
                    : "bg-transparent border-white/5 hover:border-white/10 opacity-60 hover:opacity-85"
                }`}
              >
                {/* Custom Styled Toggle Switch */}
                <div className="shrink-0 pt-0.5">
                  {isInstalled ? (
                    <ToggleRight className="h-5 w-5 text-violet-400 transition-all" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-slate-600 transition-all" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{skill.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border tracking-wide uppercase shrink-0 font-bold ${getCategoryColor(skill.category)}`}>
                      {skill.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
