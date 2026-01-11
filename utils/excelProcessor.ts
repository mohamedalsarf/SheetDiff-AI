
import * as XLSX from 'xlsx';
import { ComparisonResult, ModifiedRow } from '../types';

export const parseFile = async (file: File): Promise<{ data: any[], headers: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
        resolve({ data: jsonData, headers });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const getNumericValue = (row: any): number => {
  const keys = Object.keys(row);
  // Priority order for financial columns
  const financialKeys = ['amount', 'total', 'balance', 'price', 'paid', 'invoice_amount', 'sum'];
  
  for (const fKey of financialKeys) {
    const found = keys.find(k => k.toLowerCase().includes(fKey));
    if (found) {
      const val = parseFloat(row[found]);
      if (!isNaN(val)) return val;
    }
  }
  return 0;
};

export const compareDatasets = (dataA: any[], dataB: any[], headers: string[]): ComparisonResult => {
  const added: any[] = [];
  const removed: any[] = [];
  const modified: ModifiedRow[] = [];
  
  let totalAmountA = 0;
  let totalAmountB = 0;

  const findId = (obj: any) => 
    obj.invoice_no || obj.Invoice || obj.PO || obj.reference || obj.id || obj.ID || obj.email || obj.Reference;

  const mapA = new Map();
  dataA.forEach((row, idx) => {
    const id = findId(row) ?? `idx_${idx}`;
    mapA.set(id, row);
    totalAmountA += getNumericValue(row);
  });

  const mapB = new Map();
  dataB.forEach((row, idx) => {
    const id = findId(row) ?? `idx_${idx}`;
    mapB.set(id, row);
    totalAmountB += getNumericValue(row);
  });

  mapB.forEach((rowB, id) => {
    if (!mapA.has(id)) {
      added.push(rowB);
    } else {
      const rowA = mapA.get(id);
      const changes: { column: string, from: any, to: any }[] = [];
      
      headers.forEach(header => {
        if (rowA[header] !== rowB[header]) {
          changes.push({
            column: header,
            from: rowA[header],
            to: rowB[header]
          });
        }
      });

      if (changes.length > 0) {
        modified.push({ row: rowB, changes });
      }
    }
  });

  mapA.forEach((rowA, id) => {
    if (!mapB.has(id)) {
      removed.push(rowA);
    }
  });

  return {
    added,
    removed,
    modified,
    headers,
    summary: {
      totalA: dataA.length,
      totalB: dataB.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      totalAmountA,
      totalAmountB,
      variance: totalAmountB - totalAmountA
    }
  };
};

export const exportToExcel = (result: ComparisonResult, fileName: string) => {
  const wb = XLSX.utils.book_new();

  const flattenedModified = result.modified.map(m => {
    const changeLog = m.changes.map(c => `${c.column}: ${c.from} -> ${c.to}`).join('; ');
    return { ...m.row, _RECONCILIATION_LOG: changeLog };
  });

  if (result.added.length > 0) {
    const wsAdded = XLSX.utils.json_to_sheet(result.added);
    XLSX.utils.book_append_sheet(wb, wsAdded, "New Transactions");
  }

  if (result.removed.length > 0) {
    const wsRemoved = XLSX.utils.json_to_sheet(result.removed);
    XLSX.utils.book_append_sheet(wb, wsRemoved, "Missing in Actuals");
  }

  if (flattenedModified.length > 0) {
    const wsModified = XLSX.utils.json_to_sheet(flattenedModified);
    XLSX.utils.book_append_sheet(wb, wsModified, "Price_Amount Mismatches");
  }

  XLSX.writeFile(wb, `Audit_Report_${fileName}.xlsx`);
};
