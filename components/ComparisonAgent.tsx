
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
  Clock,
  Wallet,
  Receipt,
  Scale
} from 'lucide-react';
import { parseFile, compareDatasets, exportToExcel } from '../utils/excelProcessor';
import { analyzeComparison } from '../services/geminiService';
import { FileData, ComparisonResult, AIAnalysis, HistoryItem } from '../types';

const STORAGE_KEY = 'financial_reconciliation_history';

const ComparisonAgent: React.FC = () => {
  const [fileA, setFileA] = useState<FileData | null>(null);
  const [fileB, setFileB] = useState<FileData | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveToHistory = useCallback((newItem: HistoryItem) => {
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadHistoryItem = (item: HistoryItem) => {
    setAnalysis(item.analysis);
    setComparison({
      added: [], removed: [], modified: [], headers: [],
      summary: item.summary
    });
    setFileA({ name: item.fileNameA, data: [], headers: [] });
    setFileB({ name: item.fileNameB, data: [], headers: [] });
    setShowHistory(false);
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
      saveToHistory({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileNameA: fileA.name,
        fileNameB: fileB.name,
        summary: result.summary,
        analysis: aiResponse
      });
    } catch (err) {
      setError("Audit analysis failed. Ensure your financial files have clear headers.");
    } finally {
      setIsLoading(false);
    }
  }, [fileA, fileB, saveToHistory]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseFile(file);
      const data = { name: file.name, data: result.data, headers: result.headers };
      if (type === 'A') setFileA(data); else setFileB(data);
      setError(null);
    } catch (err) { setError("Failed to parse file."); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 relative">
      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">History</h2>
              <button onClick={() => setShowHistory(false)}><ChevronRight /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.map(item => (
                <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-4 rounded-xl border hover:bg-slate-50 cursor-pointer">
                  <div className="text-xs text-slate-400 mb-1">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="font-bold text-sm truncate">{item.fileNameB}</div>
                  <div className={`text-xs font-bold mt-2 ${item.summary.variance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Variance: {item.summary.variance.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="text-indigo-600" />
            Reconciliation Agent
          </h1>
          <p className="text-slate-500 text-sm">Compare Invoices, Payments, and Purchase Orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-slate-100 rounded-lg flex items-center gap-2 text-sm font-medium">
            <History size={18} /> History
          </button>
          {(fileA || fileB) && (
            <button onClick={() => { setFileA(null); setFileB(null); setComparison(null); }} className="text-red-600 text-sm font-medium p-2">Reset</button>
          )}
        </div>
      </div>

      {!comparison && (
        <div className="grid md:grid-cols-2 gap-6">
          <UploadCard file={fileA} label="Invoice/PO Base (File A)" onChange={(e) => handleFileUpload(e, 'A')} />
          <UploadCard file={fileB} label="Payment/Actuals (File B)" onChange={(e) => handleFileUpload(e, 'B')} />
        </div>
      )}

      {fileA && fileB && !comparison && (
        <div className="flex justify-center">
          <button onClick={runComparison} disabled={isLoading} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
            {isLoading ? <RefreshCcw className="animate-spin" /> : <Sparkles />}
            {isLoading ? "Auditing Records..." : "Reconcile Data"}
          </button>
        </div>
      )}

      {comparison && (
        <div className="space-y-8">
          {/* Balance Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BalanceCard label="Base Total" value={comparison.summary.totalAmountA} icon={<Receipt />} color="blue" />
            <BalanceCard label="Actual Total" value={comparison.summary.totalAmountB} icon={<Wallet />} color="indigo" />
            <BalanceCard 
              label="Net Variance" 
              value={comparison.summary.variance} 
              icon={<Scale />} 
              color={comparison.summary.variance === 0 ? "green" : "red"} 
              isVariance 
            />
          </div>

          {/* AI Auditor Analysis */}
          {analysis && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Sparkles className="fill-indigo-600" />
                  <h2 className="text-xl font-bold">AI Audit Report</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                  analysis.reconciliationStatus === 'Balanced' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {analysis.reconciliationStatus}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Audit Summary</h3>
                    <p className="text-slate-700 leading-relaxed text-sm">{analysis.overview}</p>
                  </div>
                  <AuditSection title="Root Causes of Difference" items={analysis.rootCauses} color="red" />
                </div>
                <div className="space-y-6">
                  <AuditSection title="Anomalies Found" items={analysis.anomalies} color="amber" />
                  <AuditSection title="Required Fixes" items={analysis.recommendations} color="indigo" />
                </div>
              </div>
            </div>
          )}

          {/* Transaction Log */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Mismatch Details</h2>
              <button onClick={() => exportToExcel(comparison, fileB?.name || 'reconciliation')} className="text-green-600 flex items-center gap-1 text-sm font-bold">
                <Download size={16} /> Export Excel
              </button>
            </div>
            <div className="divide-y overflow-x-auto">
              {comparison.modified.length > 0 ? (
                comparison.modified.map((mod, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-slate-400 uppercase font-bold">
                      Mismatch ID: {idx + 1}
                    </div>
                    {mod.changes.map((c, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm mb-1">
                        <span className="w-32 font-medium text-slate-600 truncate">{c.column}</span>
                        <span className="bg-red-50 text-red-600 line-through px-2 py-0.5 rounded text-xs">{String(c.from)}</span>
                        <ArrowRightLeft size={12} className="text-slate-300" />
                        <span className="bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded text-xs">{String(c.to)}</span>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">All matched transactions align perfectly.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UploadCard = ({ file, label, onChange }: any) => (
  <div className={`p-8 border-2 border-dashed rounded-3xl transition-all ${file ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
    <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
      <div className={`p-4 rounded-full ${file ? 'bg-green-100' : 'bg-indigo-50'}`}>
        {file ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-indigo-600" />}
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-700">{file ? file.name : label}</p>
        <p className="text-xs text-slate-400 mt-1">Select Excel or CSV</p>
      </div>
      <input type="file" className="hidden" onChange={onChange} />
    </label>
  </div>
);

const BalanceCard = ({ label, value, icon, color, isVariance }: any) => (
  <div className={`bg-white border rounded-2xl p-6 shadow-sm border-${color}-100 flex items-center gap-4`}>
    <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}>{icon}</div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${isVariance && value !== 0 ? 'text-red-600' : 'text-slate-900'}`}>
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  </div>
);

const AuditSection = ({ title, items, color }: any) => (
  <div>
    <h4 className="font-bold text-slate-800 text-sm mb-3">{title}</h4>
    <ul className="space-y-2">
      {items.map((item: string, i: number) => (
        <li key={i} className="flex gap-2 text-sm text-slate-600 leading-snug">
          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full bg-${color}-400 shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default ComparisonAgent;
