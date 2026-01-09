
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  ArrowRightLeft, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  Download, 
  History, 
  Trash2,
  ChevronRight,
  Clock
} from 'lucide-react';
import { parseFile, compareDatasets, exportToExcel } from '../utils/excelProcessor';
import { analyzeComparison } from '../services/geminiService';
import { FileData, ComparisonResult, AIAnalysis, HistoryItem } from '../types';

const STORAGE_KEY = 'excel_insight_history';

const ComparisonAgent: React.FC = () => {
  const [fileA, setFileA] = useState<FileData | null>(null);
  const [fileB, setFileB] = useState<FileData | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = useCallback((newItem: HistoryItem) => {
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 10); // Keep last 10
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setAnalysis(item.analysis);
    // We can't easily restore the full raw data comparison object from storage without blowing the limit,
    // so we create a skeleton comparison for the summary view.
    setComparison({
      added: [],
      removed: [],
      modified: [],
      headers: [],
      summary: item.summary
    });
    setFileA({ name: item.fileNameA, data: [], headers: [] });
    setFileB({ name: item.fileNameB, data: [], headers: [] });
    setShowHistory(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseFile(file);
      const fileData = { name: file.name, data: result.data, headers: result.headers };
      if (type === 'A') setFileA(fileData);
      else setFileB(fileData);
      setError(null);
    } catch (err) {
      setError(`Error parsing ${file.name}. Ensure it is a valid Excel or CSV file.`);
    }
  };

  const runComparison = useCallback(async () => {
    if (!fileA || !fileB) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = compareDatasets(fileA.data, fileB.data, fileA.headers);
      setComparison(result);

      const aiResponse = await analyzeComparison(result, fileA.name, fileB.name);
      setAnalysis(aiResponse);

      // Save to history
      const historyEntry: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileNameA: fileA.name,
        fileNameB: fileB.name,
        summary: result.summary,
        analysis: aiResponse
      };
      saveToHistory(historyEntry);
    } catch (err) {
      setError("Failed to generate AI analysis. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  }, [fileA, fileB, saveToHistory]);

  const handleExport = () => {
    if (comparison && fileB) {
      exportToExcel(comparison, fileB.name.split('.')[0]);
    }
  };

  const reset = () => {
    setFileA(null);
    setFileB(null);
    setComparison(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 relative">
      {/* History Sidebar/Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-indigo-600" /> Previous Analyses
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronRight />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">No saved analyses yet.</div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer group transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Clock size={12} />
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate mb-1">{item.fileNameB}</p>
                    <p className="text-xs text-slate-500 truncate mb-3">vs {item.fileNameA}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">+{item.summary.addedCount}</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">-{item.summary.removedCount}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">~{item.summary.modifiedCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-4 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-600" />
            Comparison Agent
          </h1>
          <p className="text-slate-500 text-sm">Compare Excel files with AI insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <History size={18} />
            History
          </button>
          {(fileA || fileB) && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <RefreshCcw size={16} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {!comparison && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-8 border-2 border-dashed rounded-3xl transition-all ${fileA ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
            <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
              <div className={`p-4 rounded-full ${fileA ? 'bg-green-100' : 'bg-indigo-50'}`}>
                {fileA ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-indigo-600" />}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">{fileA ? fileA.name : "Upload Base File (A)"}</p>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, 'A')} />
              </div>
            </label>
          </div>

          <div className={`p-8 border-2 border-dashed rounded-3xl transition-all ${fileB ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
            <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
              <div className={`p-4 rounded-full ${fileB ? 'bg-green-100' : 'bg-indigo-50'}`}>
                {fileB ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-indigo-600" />}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">{fileB ? fileB.name : "Upload New File (B)"}</p>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileUpload(e, 'B')} />
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Compare Button */}
      {fileA && fileB && !comparison && (
        <div className="flex justify-center">
          <button
            onClick={runComparison}
            disabled={isLoading}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg shadow-xl hover:bg-indigo-700 disabled:bg-indigo-300 transition-all"
          >
            {isLoading ? <RefreshCcw className="animate-spin" /> : <Sparkles />}
            {isLoading ? "Analyzing..." : "Compare Files"}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Results Section */}
      {comparison && (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <StatCard label="Added" value={comparison.summary.addedCount} color="green" />
              <StatCard label="Removed" value={comparison.summary.removedCount} color="red" />
              <StatCard label="Modified" value={comparison.summary.modifiedCount} color="amber" />
              <StatCard label="Total Rows" value={comparison.summary.totalB} color="indigo" />
            </div>
            <button 
              onClick={handleExport}
              className="ml-4 flex flex-col items-center gap-2 p-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-100"
            >
              <Download size={24} />
              <span className="text-xs font-bold uppercase">Export</span>
            </button>
          </div>

          {analysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-indigo-800">
                <Sparkles size={24} className="fill-indigo-600" />
                <h2 className="text-xl font-bold">AI Agent Insights</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-2">Executive Overview</h3>
                  <p className="text-slate-700 leading-relaxed">{analysis.overview}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <AnalysisSection title="Key Insights" items={analysis.keyInsights} icon="💡" />
                  <AnalysisSection title="Anomalies" items={analysis.anomalies} icon="⚠️" />
                  <AnalysisSection title="Recommendations" items={analysis.recommendations} icon="🚀" />
                </div>
              </div>
            </div>
          )}

          {comparison.modified.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-bold text-slate-800">Modified Row Details</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {comparison.modified.map((mod, idx) => (
                  <div key={idx} className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">MODIFIED</span>
                    </div>
                    <div className="grid gap-3">
                      {mod.changes.map((change, cIdx) => (
                        <div key={cIdx} className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-slate-700 min-w-[100px]">{change.column}:</span>
                          <span className="bg-red-50 text-red-600 line-through px-2 py-0.5 rounded">{String(change.from)}</span>
                          <ArrowRightLeft size={14} className="text-slate-400" />
                          <span className="bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded">{String(change.to)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  return (
    <div className={`p-5 rounded-2xl border ${colors[color]} text-center`}>
      <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
};

const AnalysisSection: React.FC<{ title: string, items: string[], icon: string }> = ({ title, items, icon }) => (
  <div className="space-y-3">
    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
      <span>{icon}</span> {title}
    </h4>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-2 text-sm text-slate-600 leading-snug">
          <span className="text-indigo-300 font-bold">•</span> {item}
        </li>
      ))}
    </ul>
  </div>
);

export default ComparisonAgent;
