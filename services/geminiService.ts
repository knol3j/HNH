import { GoogleGenAI, Type } from "@google/genai";
import { ComputeNode, JobSpec } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const analyzeComputeRequirements = async (taskDescription: string): Promise<JobSpec> => {
  try {
    const ai = getAIClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a DevOps and AI Infrastructure expert. A user wants to run this computing task: "${taskDescription}". 
      Analyze the technical requirements. Recommend specific GPU hardware (e.g. H100, A100, 4090), estimate VRAM usage, and determine duration.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A technical title for the job" },
            description: { type: Type.STRING, description: "Technical summary of the workload" },
            recommendedGpu: { type: Type.STRING, description: "Specific GPU model recommendation" },
            estimatedDuration: { type: Type.STRING, description: "Estimated time to complete" },
            maxPrice: { type: Type.NUMBER, description: "Recommended max price per hour in USD" },
            reasoning: { type: Type.STRING, description: "Why this hardware was chosen" }
          },
          required: ["title", "description", "recommendedGpu", "estimatedDuration", "reasoning", "maxPrice"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Error:", error);
    return {
      title: "Analysis Failed",
      description: "Could not analyze requirements.",
      recommendedGpu: "Generic GPU",
      estimatedDuration: "Unknown",
      maxPrice: 0,
      reasoning: "AI Service unavailable."
    };
  }
};

export const getNetworkStatusAnalysis = async (stats: any): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Given these decentralized compute network stats: ${JSON.stringify(stats)}, provide a 1-sentence quick status update for the dashboard header about market liquidity or supply demand.`,
    });
    return response.text || "Network status stable.";
  } catch (error) {
    return "Network optimal.";
  }
};