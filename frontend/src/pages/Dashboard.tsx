import { Loader2, Zap, Sliders, Cpu, Activity } from "lucide-react";
import { useState } from "react";
import { routeTask } from "../api/client";
import { Pipeline } from "../components/Pipeline";
import { RouterOutput } from "../components/RouterOutput";
import { SkillList } from "../components/SkillList";
import { useSkills } from "../hooks/useSkills";
import type { RouteResponse } from "../types";

export function Dashboard() {
  const { skills, installedSkillIds, setInstalledSkillIds, error } = useSkills();
  const [task, setTask] = useState("Create a bar chart from this CSV and explain the trend.");
  const [k, setK] = useState(10);
  const [threshold, setThreshold] = useState(0.45);
  const [result, setResult] = useState<RouteResponse>();
  const [routeError, setRouteError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function runRouter() {
    if (!task.trim()) return;
    setLoading(true);
    setRouteError(undefined);
    try {
      const response = await routeTask({
        task,
        k,
        threshold,
        installedSkillIds
      });
      setResult(response);
    } catch (caught) {
      setRouteError(caught instanceof Error ? caught.message : "Failed to route task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-screen w-screen grid-cols-[340px_1fr_420px] bg-[#090d10] text-[#f8fafc] overflow-hidden select-none">
      {/* Left Column: Skill Selector Panel */}
      <SkillList 
        skills={skills} 
        installedSkillIds={installedSkillIds} 
        onChange={setInstalledSkillIds} 
      />

      {/* Middle Column: Central Router Console */}
      <main className="flex flex-col h-full overflow-y-auto border-r border-white/5 bg-[#090d10]/40">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-white/5 px-8 py-4 backdrop-blur-md sticky top-0 z-10 bg-[#090d10]/80">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Cpu className="h-5 w-5" />
              <div className="absolute -inset-0.5 rounded-xl bg-violet-500/20 blur-sm opacity-40"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Skill Router</h1>
              <p className="text-xs text-slate-400">Hybrid Retrieval Vector + BM25 &amp; LLM Routing Layer</p>
            </div>
          </div>

          {/* Latency Indicators */}
          {result?.metrics && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 text-emerald-400">
                <Zap className="h-3 w-3" />
                <span>RAG: {result.metrics.retrievalLatencyMs}ms</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/5 border border-violet-500/10 px-2.5 py-1 text-violet-400">
                <Activity className="h-3 w-3" />
                <span>LLM: {result.metrics.llmLatencyMs}ms</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-[#0f171e] border border-white/5 px-2.5 py-1 text-slate-300">
                <span>Total: {result.metrics.totalLatencyMs}ms</span>
              </div>
            </div>
          )}
        </header>

        {/* Content Body */}
        <div className="flex-1 space-y-6 p-8 max-w-4xl mx-auto w-full">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 flex gap-2">
              <span className="font-semibold">Core Error:</span> {error}
            </div>
          )}
          {routeError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 flex gap-2">
              <span className="font-semibold">Routing Error:</span> {routeError}
            </div>
          )}

          {/* Task Console Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <label htmlFor="task-prompt" className="font-semibold tracking-wider uppercase text-slate-400">Task Prompt Input</label>
              <span>{task.length} chars</span>
            </div>
            <div className="relative group">
              <textarea
                id="task-prompt"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="Describe the task you want to route..."
                className="h-32 w-full resize-none rounded-xl border border-white/10 bg-[#0f171e]/90 p-4 text-sm text-slate-200 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all font-sans placeholder-slate-500"
              />
              <div className="absolute -inset-px rounded-xl border border-transparent group-focus-within:border-violet-500/30 pointer-events-none transition-all"></div>
            </div>
          </section>

          {/* Hyperparameter Controllers */}
          <section className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-3">
              <Sliders className="h-4 w-4 text-violet-400" />
              <span>Router Hyperparameters</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Slider K */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-slate-300">Candidates to Retrieve (K)</span>
                  <span className="text-violet-400 font-bold">{k}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={k}
                  onChange={(event) => setK(Number(event.target.value))}
                  className="slider-custom text-violet-400"
                />
              </div>

              {/* Slider Threshold */}
              <div className="border-l border-white/5 pl-6">
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-slate-300">Confidence Threshold</span>
                  <span className="text-rose-400 font-bold">{threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="slider-custom text-rose-400"
                />
              </div>
            </div>
          </section>

          {/* Manual Run button */}
          <div className="flex justify-start">
            <button
              onClick={() => void runRouter()}
              disabled={loading || !task.trim() || installedSkillIds.length === 0}
              className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-violet-500/20 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Computing Routing Path...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300" />
                  <span>Force Route Task</span>
                </>
              )}
            </button>
          </div>

          {/* Pipeline Schematic Visualizer */}
          <Pipeline loading={loading} result={result} k={k} threshold={threshold} />
        </div>
      </main>

      {/* Right Column: Visual Metrics inspector */}
      <RouterOutput result={result} threshold={threshold} />
    </div>
  );
}
