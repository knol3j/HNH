/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GEMINI_API_KEY?: string;
  readonly API_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY?: string;
    readonly GEMINI_API_KEY?: string;
  }
}

declare const process: {
  env: {
    API_KEY?: string;
    GEMINI_API_KEY?: string;
  };
};

