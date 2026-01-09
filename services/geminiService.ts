
import { GoogleGenAI, Type } from "@google/genai";
import { ComparisonResult, AIAnalysis } from "../types";

export const analyzeComparison = async (
  result: ComparisonResult,
  fileNameA: string,
  fileNameB: string
): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze the differences between two datasets: "${fileNameA}" (Base) and "${fileNameB}" (Comparison).
    
    Summary of changes:
    - Original row count: ${result.summary.totalA}
    - New row count: ${result.summary.totalB}
    - Rows added: ${result.summary.addedCount}
    - Rows removed: ${result.summary.removedCount}
    - Rows modified: ${result.summary.modifiedCount}

    Structural data:
    - Headers: ${result.headers.join(", ")}

    Sample of modified rows (first 5):
    ${JSON.stringify(result.modified.slice(0, 5), null, 2)}

    Sample of added rows (first 5):
    ${JSON.stringify(result.added.slice(0, 5), null, 2)}

    Task: Provide a high-level executive summary, key insights, potential anomalies found in the changes, and actionable recommendations.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING, description: "A summary of the differences." },
          keyInsights: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of significant findings."
          },
          anomalies: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Any suspicious or unexpected changes."
          },
          recommendations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Actionable next steps based on the comparison."
          }
        },
        required: ["overview", "keyInsights", "anomalies", "recommendations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as AIAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Invalid AI analysis format");
  }
};
