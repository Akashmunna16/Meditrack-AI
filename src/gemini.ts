import { GoogleGenAI } from "@google/genai";

// Resolve the Gemini API key from multiple environment sources
const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || 
                       import.meta.env.VITE_GEMINI_API_KEY || 
                       process.env.GEMINI_API_KEY;

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface ReportAnalysis {
  summary: string;
  insights: string[];
  urgentActions: string[];
  biomarkers?: {
    name: string;
    value: number;
    unit: string;
    category: string;
  }[];
}

/**
 * Analyzes a medical report (OCR text or direct file) using Gemini.
 * Gemini 1.5 Flash handles OCR natively for images and PDFs.
 */
export async function analyzeMedicalReport(
  fileName: string,
  textContext?: string,
  fileData?: { data: string; mimeType: string }
): Promise<ReportAnalysis> {
  const prompt = `
    You are a medical report analyzer specialized in clinical data extraction and longitudinal tracking.
    
    TASK:
    1. Perform OCR if a file is provided.
    2. Analyze the medical data.
    3. Generate a patient-friendly summary.
    4. EXTRACT BIOMARKERS: Specifically look for numeric values like Blood Glucose, HbA1c, Cholesterol (LDL/HDL), Blood Pressure, Vitamin levels, BMI, etc.
    
    Provide the analysis in the following format:
    1. A concise summary (2-3 sentences).
    2. A list of key insights or findings.
    3. A list of urgent actions or questions to ask a doctor (if any).
    4. A "biomarkers" array with objects containing: "name", "value" (number), "unit", and "category" (e.g., "Metabolic", "Lipids", "Vitamins").
    
    Return the response as valid JSON.
  `;

  try {
    const contents: any[] = [{ parts: [{ text: prompt }] }];
    
    if (textContext) {
      contents[0].parts.push({ text: `TEXT CONTEXT:\n${textContext}` });
    }
    
    if (fileData) {
      contents[0].parts.push({
        inlineData: {
          data: fileData.data.split(",")[1] || fileData.data, // Strip base64 prefix if present
          mimeType: fileData.mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      summary: result.summary || "Analysis complete.",
      insights: result.insights || [],
      urgentActions: result.urgentActions || [],
      biomarkers: result.biomarkers || [],
    };
  } catch (error) {
    console.error("AI Brain (OCR) Error:", error);
    throw new Error("Failed to process the medical report. Ensure the file is a clear image or PDF.");
  }
}

/**
 * Med-Chat RAG logic for answering health questions.
 */
export async function chatWithAI(
  userQuery: string,
  history: { role: "user" | "model"; content: string }[],
  patientContext?: string
): Promise<string> {
  const systemInstruction = `
    You are Meditrack-AI, a helpful medical assistant. 
    Use the provided patient context to answer questions accurately.
    Always advise the user to consult a professional for medical diagnosis.
    Keep your answers empathetic and clear.
    
    PATIENT CONTEXT:
    ${patientContext || "No specific context provided."}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role === "user" ? "user" as const : "model" as const, parts: [{ text: h.content }] })),
        { role: "user" as const, parts: [{ text: userQuery }] }
      ],
      config: {
        systemInstruction,
      },
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "The assistant is currently unavailable. Please try again later.";
  }
}
