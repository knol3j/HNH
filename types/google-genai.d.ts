declare module "@google/genai" {
  export enum Type {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array"
  }

  export interface GenerateContentConfig {
    responseMimeType?: string;
    responseSchema?: {
      type: Type;
      properties?: Record<string, any>;
      required?: string[];
    };
  }

  export interface GenerateContentRequest {
    model: string;
    contents: string;
    config?: GenerateContentConfig;
  }

  export interface GenerateContentResponse {
    text: string;
  }

  export interface Models {
    generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
  }

  export interface GoogleGenAIOptions {
    apiKey: string;
  }

  export class GoogleGenAI {
    constructor(options: GoogleGenAIOptions);
    models: Models;
  }
}

