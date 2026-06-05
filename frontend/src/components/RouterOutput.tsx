import { useState } from "react";
import { CheckCircle2, XCircle, Code, HelpCircle, ChevronDown, ChevronUp, Cpu, Award } from "lucide-react";
import type { RouteResponse } from "../types";

interface Props {
  result: RouteResponse | undefined;
  threshold: number;
}

function score(value: number) {
  return value.toFixed(3);
}

export function RouterOutput({ result, threshold }: Props) {
  const [showJson, setShowJson] = useState(false);

  // Split retrieved skills into above and below threshold
  const candidates = result?.retrievedSkills ?? [];
  
  // Render confidence percentage dial
  const confidencePercent = result ? Math.round(result.confidence * 100) : 0;
  
  // Determine color of confidence gauge
  const getConfidenceColor = (conf: number) => {
    if (conf >= threshold) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    return "text-rose-400 border-rose-500/30 bg-rose-500/5";
  };

  return (
    <aside className="flex flex-col h-full bg-[#0a0f14] border-l border-white/5 overflow-hidden">
      {/* Pane Header */}
      <div className="border-b border-white/5 px-6 py-4 shrink-0">
        <h2 className="text-sm font-bold tracking-wide uppercase text-white">Router Diagnosis</h2>
        <p className="text-[11px] text-slate-500">Retrieval scores and final LLM classification</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-60 text-center border border-dashed border-white/5 rounded-2xl p-6 bg-[#0f171e]/20">
            <HelpCircle className="h-8 w-8 text-slate-600 mb-3 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-400 mb-1">Awaiting Execution</h4>
            <p className="text-[10px] text-slate-500 max-w-[200px]">
              Provide a prompt and click "Force Route Task" to see routing diagnostics.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Classification Summary Card */}
            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-violet-400" />
                  Routing Outcome
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getConfidenceColor(result.confidence)}`}>
                  Conf: {confidencePercent}%
                </span>
              </div>

              {result.selectedSkills.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">
                      Successfully Routed to {result.selectedSkills.length} Skill{result.selectedSkills.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {result.selectedSkills.map((skill) => (
                      <span key={skill.id} className="text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-md">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <XCircle className="h-4.5 w-4.5 shrink-0" />
                    <span className="text-xs font-bold text-slate-100">Threshold Block (No Route Match)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    The router's confidence score ({confidencePercent}%) was below your specified threshold ({Math.round(threshold * 100)}%). Fallback execution triggered.
                  </p>
                </div>
              )}

              {/* LLM Reasoning block */}
              {result.reasoning && (
                <div className="bg-[#111720] border border-white/5 rounded-xl p-3.5 text-[10px] leading-relaxed text-slate-300">
                  <div className="font-bold text-slate-400 mb-1 uppercase tracking-wider text-[8px]">LLM Routing Justification</div>
                  {result.reasoning}
                </div>
              )}
            </section>

            {/* RAG Retrieved Candidates Analysis */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">RAG Candidate Scores ({candidates.length})</h3>
              
              <div className="space-y-3">
                {candidates.map((item, index) => {
                  return (
                    <div 
                      key={item.skill.id} 
                      className="relative rounded-xl border p-4 bg-[#0f171e]/60 transition-all border-white/5 hover:border-violet-500/20"
                    >
                      {/* Rank tag */}
                      <div className="absolute top-3 right-3 text-[9px] font-mono text-slate-500">
                        #{index + 1}
                      </div>

                      {/* Header */}
                      <div className="mb-2">
                        <div className="text-xs font-bold text-slate-200">{item.skill.name}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{item.skill.category}</div>
                      </div>

                      {/* Score Metrics breakdown bars */}
                      <div className="space-y-2 text-[9px]">
                        {/* Dense Score Bar */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Dense vector score:</span>
                            <span className="font-semibold text-emerald-400">{score(item.denseScore)}</span>
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, item.denseScore * 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Sparse Score Bar */}
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Sparse BM25 score:</span>
                            <span className="font-semibold text-cyan-400">{score(item.bm25Score)}</span>
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, item.bm25Score * 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Collapsible raw details debug pane */}
            <section className="border-t border-white/5 pt-4">
              <button
                onClick={() => setShowJson(!showJson)}
                className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-400 transition-all py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" />
                  Inspect Raw Response JSON
                </span>
                {showJson ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showJson && (
                <div className="mt-3 bg-[#0d1218] border border-white/5 rounded-xl p-4 overflow-x-auto max-h-60 scrollbar-thin">
                  <pre className="text-[9px] text-slate-400 font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
