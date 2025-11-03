/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GROQ_API_KEY: string
  // add other VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
