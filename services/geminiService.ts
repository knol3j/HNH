import { GoogleGenAI, Type } from "@google/genai";
import { ComputeNode, JobSpec } from "../types";

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found. Set VITE_GEMINI_API_KEY in environment.");
  return new GoogleGenAI({ apiKey });
};

export const analyzeComputeRequirements = async (taskDescription: string): Promise<JobSpec> => {
  try {
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Given these decentralized compute network stats: ${JSON.stringify(stats)}, provide a 1-sentence quick status update for the dashboard header about market liquidity or supply demand.`,
      });
      return response.text || "Network status stable.";
    }
  } catch (error) {
    // Fall through to deterministic logic
  }

  // Deterministic "Expert System" Logic (Real function, not fake AI)
  if (stats.activeNodes > 0) {
    if (stats.jobsRunning > 0) return `System Active: Mining ${stats.activeNodes} Node(s). Efficiency High.`;
    return `System Idle: ${stats.activeNodes} Node(s) Online. Waiting for jobs.`;
  }
  return "System Offline: No active nodes detected.";
};

/**
 * AI-powered mining optimization recommendation
 */
export interface MiningRecommendation {
  action: 'HOLD' | 'SWITCH' | 'OPTIMIZE';
  currentCoin: string;
  recommendedCoin: string;
  reason: string;
  expectedImprovement: string;
}

export const getMiningOptimization = async (
  currentCoin: string,
  hashrate: number,
  coins: { symbol: string; price: number; profitabilityScore: number }[]
): Promise<MiningRecommendation> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `You are a crypto mining optimization AI. 
          
Current state:
- Mining: ${currentCoin}
- Hashrate: ${hashrate} H/s
- Available coins: ${JSON.stringify(coins)}

Analyze and recommend:
1. Should the user HOLD (keep mining current), SWITCH (change coin), or OPTIMIZE (adjust settings)?
2. If SWITCH, which coin and why?
3. What's the expected improvement?

Respond in JSON: { "action": "HOLD|SWITCH|OPTIMIZE", "currentCoin": "...", "recommendedCoin": "...", "reason": "...", "expectedImprovement": "..." }`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) throw new Error("No recommendation generated");
      return JSON.parse(text);
    }
  } catch (error) {
    // console.error("AI Optimization Error:", error);
  }

  // Deterministic Logic (Real function)
  // Check if there is a better coin
  if (coins.length > 0) {
    const best = coins[0];
    const current = coins.find(c => c.symbol === currentCoin);

    if (current && best.symbol !== currentCoin) {
      const improvement = ((best.profitabilityScore - current.profitabilityScore) / current.profitabilityScore) * 100;
      if (improvement > 10) {
        return {
          action: 'SWITCH',
          currentCoin,
          recommendedCoin: best.symbol,
          reason: `${best.symbol} is ${improvement.toFixed(1)}% more profitable currently.`,
          expectedImprovement: `${improvement.toFixed(1)}%`
        };
      }
    }
  }

  return {
    action: 'HOLD',
    currentCoin,
    recommendedCoin: currentCoin,
    reason: 'Current strategy is optimal based on market data.',
    expectedImprovement: '0%'
  };
};