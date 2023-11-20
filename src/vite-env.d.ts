/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_SSO_ORIGIN: string;
  VITE_API_LOTUS: string;
  VITE_IMAP_LOTUS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
