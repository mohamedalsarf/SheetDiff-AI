
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

export const compareDatasets = (dataA: any[], dataB: any[], headers: string[]): ComparisonResult => {
  const added: any[] = [];
  const removed: any[] = [];
  const modified: ModifiedRow[] = [];

  const findId = (obj: any) => obj.id || obj.ID || obj.email || obj.Email || obj.code || obj.Code;

  const mapA = new Map();
  dataA.forEach((row, idx) => mapA.set(findId(row) ?? idx, row));

  const mapB = new Map();
  dataB.forEach((row, idx) => mapB.set(findId(row) ?? idx, row));

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
      modifiedCount: modified.length
    }
  };
};

export const exportToExcel = (result: ComparisonResult, fileName: string) => {
  const wb = XLSX.utils.book_new();

  // Prepare Modified data for export
  const flattenedModified = result.modified.map(m => {
    const changeLog = m.changes.map(c => `${c.column}: ${c.from} -> ${c.to}`).join('; ');
    return { ...m.row, _CHANGES: changeLog };
  });

  if (result.added.length > 0) {
    const wsAdded = XLSX.utils.json_to_sheet(result.added);
    XLSX.utils.book_append_sheet(wb, wsAdded, "Added Rows");
  }

  if (result.removed.length > 0) {
    const wsRemoved = XLSX.utils.json_to_sheet(result.removed);
    XLSX.utils.book_append_sheet(wb, wsRemoved, "Removed Rows");
  }

  if (flattenedModified.length > 0) {
    const wsModified = XLSX.utils.json_to_sheet(flattenedModified);
    XLSX.utils.book_append_sheet(wb, wsModified, "Modified Rows");
  }

  XLSX.writeFile(wb, `Comparison_Report_${fileName}.xlsx`);
};
