import { ArrowRight, Brain, Cpu, Layers, SlidersHorizontal, MessageSquare, Terminal } from "lucide-react";
import type { RouteResponse } from "../types";

interface Props {
  loading: boolean;
  result: RouteResponse | undefined;
  k: number;
  threshold: number;
}

export function Pipeline({ loading, result, k, threshold }: Props) {
  // Check if LLM confidence passed the threshold
  const passedThreshold = result ? result.confidence >= threshold : false;

  // Count how many candidates passed the threshold
  const totalCandidates = result ? result.retrievedSkills.length : 0;

  // Determine stage active states
  const isInputActive = true;
  const isSearchActive = loading || !!result;
  const isFilterActive = !loading && !!result;
  const isLLMActive = !loading && !!result;

  return (
    <section className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span>Interactive Execution Flow</span>
        </div>
        {loading && (
          <span className="text-[10px] font-bold text-violet-400 animate-pulse bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10">
            COMPUTING PIPELINE...
          </span>
        )}
      </div>

      <div className="relative flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-2">
        {/* Step 1: Input */}
        <div className={`flex-1 rounded-xl border p-4 bg-[#0f171e] transition-all relative ${
          loading ? "border-violet-500/30 pulse-active shadow-[0_0_15px_rgba(139,92,246,0.1)]" : "border-white/5"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">1. Task Input</h4>
          </div>
          <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">Natural Language query tokenization</p>
          <span className="text-[9px] font-mono text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
            Active Prompt
          </span>
        </div>

        {/* Cable Connector 1 */}
        <div className="flex items-center justify-center shrink-0 w-6 h-6 md:h-auto md:w-auto self-center">
          <ArrowRight className={`h-4 w-4 ${loading ? "text-violet-400 animate-pulse" : result ? "text-emerald-500" : "text-slate-700"}`} />
        </div>

        {/* Step 2: Hybrid RAG Search */}
        <div className={`flex-1 rounded-xl border p-4 bg-[#0f171e] transition-all relative ${
          loading ? "border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.05)]" : isSearchActive ? "border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.02)]" : "border-white/5"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-7 w-7 rounded-lg text-emerald-400 flex items-center justify-center shrink-0 transition-all ${
              isSearchActive ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-white/5 border border-white/5"
            }`}>
              <Layers className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">2. Hybrid Retrieval</h4>
          </div>
          <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">Vector store + BM25 score merge</p>
          {result ? (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
              Fetched K={k} ({totalCandidates} available)
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">Awaiting execute</span>
          )}
        </div>

        {/* Cable Connector 2 */}
        <div className="flex items-center justify-center shrink-0 w-6 h-6 md:h-auto md:w-auto self-center">
          <ArrowRight className={`h-4 w-4 ${loading ? "text-violet-400 animate-pulse" : result ? "text-emerald-500" : "text-slate-700"}`} />
        </div>

        {/* Step 3: Threshold Filter */}
        <div className={`flex-1 rounded-xl border p-4 bg-[#0f171e] transition-all relative ${
          isFilterActive ? "border-coral-500/20" : "border-white/5"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-7 w-7 rounded-lg text-rose-400 flex items-center justify-center shrink-0 transition-all ${
              isFilterActive ? "bg-rose-500/10 border border-rose-500/25" : "bg-white/5 border border-white/5"
            }`}>
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">3. Threshold Filter</h4>
          </div>
          <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">Filters skills below confidence score</p>
          {result ? (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              passedThreshold 
                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                : "text-rose-400 bg-rose-500/5 border-rose-500/10"
            }`}>
              {passedThreshold ? "Passed" : "Blocked"} (Conf: {Math.round(result.confidence * 100)}% vs {Math.round(threshold * 100)}%)
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">Awaiting execute</span>
          )}
        </div>

        {/* Cable Connector 3 */}
        <div className="flex items-center justify-center shrink-0 w-6 h-6 md:h-auto md:w-auto self-center">
          <ArrowRight className={`h-4 w-4 ${loading ? "text-violet-400 animate-pulse" : result ? "text-emerald-500" : "text-slate-700"}`} />
        </div>

        {/* Step 4: LLM Selector */}
        <div className={`flex-1 rounded-xl border p-4 bg-[#0f171e] transition-all relative ${
          isLLMActive ? "border-violet-500/20" : "border-white/5"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-7 w-7 rounded-lg text-violet-400 flex items-center justify-center shrink-0 transition-all ${
              isLLMActive ? "bg-violet-500/10 border border-violet-500/25" : "bg-white/5 border border-white/5"
            }`}>
              <Brain className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">4. LLM Selector</h4>
          </div>
          <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">OpenRouter selects final route match</p>
          {result ? (
            <span className="text-[9px] font-mono text-violet-400 bg-violet-500/5 px-1.5 py-0.5 rounded border border-violet-500/10">
              Selected {result.selectedSkills.length} ({Math.round(result.confidence * 100)}% Conf)
            </span>
          ) : (
            <span className="text-[9px] text-slate-500">Awaiting execute</span>
          )}
        </div>
      </div>
    </section>
  );
}
