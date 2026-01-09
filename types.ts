
export interface ComparisonResult {
  added: any[];
  removed: any[];
  modified: ModifiedRow[];
  headers: string[];
  summary: {
    totalA: number;
    totalB: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

export interface ModifiedRow {
  row: any;
  changes: {
    column: string;
    from: any;
    to: any;
  }[];
}

export interface FileData {
  name: string;
  data: any[];
  headers: string[];
}

export interface AIAnalysis {
  overview: string;
  keyInsights: string[];
  anomalies: string[];
  recommendations: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileNameA: string;
  fileNameB: string;
  summary: ComparisonResult['summary'];
  analysis: AIAnalysis;
}
