
import { GoogleGenAI, Type } from "@google/genai";
import { ComparisonResult, AIAnalysis } from "../types";

export const analyzeComparison = async (
  result: ComparisonResult,
  fileNameA: string,
  fileNameB: string
): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are a Senior Financial Auditor. Analyze the reconciliation between two files: 
    File A (Base): "${fileNameA}" and File B (Actuals): "${fileNameB}".

    Financial Summary:
    - Total Balance in Base: ${result.summary.totalAmountA.toFixed(2)}
    - Total Balance in Actuals: ${result.summary.totalAmountB.toFixed(2)}
    - Net Variance: ${result.summary.variance.toFixed(2)}
    
    Change Details:
    - New records (Purchases/Payments): ${result.summary.addedCount}
    - Missing records: ${result.summary.removedCount}
    - Modified records (Amount/Date changes): ${result.summary.modifiedCount}

    Headers detected: ${result.headers.join(", ")}

    Sample Data of Modified Transactions:
    ${JSON.stringify(result.modified.slice(0, 10), null, 2)}

    Sample Data of New Transactions:
    ${JSON.stringify(result.added.slice(0, 10), null, 2)}

    TASK:
    1. Identify the primary root causes for the balance variance (e.g., specific missing payments, pricing mismatches, or duplicate invoices).
    2. Determine a Reconciliation Status.
    3. List specific anomalies that look like errors (e.g., negative amounts, extreme outliers).
    4. Suggest actionable steps to balance the books.

    Return the analysis in structured JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING, description: "Executive summary of the reconciliation." },
          reconciliationStatus: { 
            type: Type.STRING, 
            enum: ['Balanced', 'Discrepancy Found', 'Critical Mismatch'] 
          },
          rootCauses: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Bullet points explaining why the balances don't match."
          },
          anomalies: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Suspicious data points or accounting errors."
          },
          recommendations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "How to fix the identified issues."
          }
        },
        required: ["overview", "reconciliationStatus", "rootCauses", "anomalies", "recommendations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as AIAnalysis;
  } catch (error) {
    console.error("Failed to parse financial analysis:", error);
    throw new Error("Invalid financial audit format");
  }
};
