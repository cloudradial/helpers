import { Entry } from "@napi-rs/keyring";

const SERVICE = "cloudradial-ucp-mcp";
const KEY_PUBLIC = "public_key";
const KEY_PRIVATE = "private_key";
const KEY_BASE_URL = "base_url";

const DEFAULT_BASE_URL = "https://api.us.cloudradial.com";

export interface Credentials {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
}

export type CredentialSource = "env" | "keychain" | null;

export interface CredentialStatus {
  configured: boolean;
  source: CredentialSource;
  baseUrl: string | null;
  /** Last 4 chars of the public key for confirmation — never the full key. */
  publicKeyHint: string | null;
}

function entry(account: string): Entry {
  return new Entry(SERVICE, account);
}

function readKeychain(): Credentials | null {
  try {
    const pub = entry(KEY_PUBLIC).getPassword();
    const priv = entry(KEY_PRIVATE).getPassword();
    if (!pub || !priv) return null;
    const baseUrl = entry(KEY_BASE_URL).getPassword() || DEFAULT_BASE_URL;
    return { publicKey: pub, privateKey: priv, baseUrl };
  } catch {
    return null;
  }
}

function readEnv(): Credentials | null {
  const pub = process.env.CLOUDRADIAL_PUBLIC_KEY;
  const priv = process.env.CLOUDRADIAL_PRIVATE_KEY;
  if (!pub || !priv) return null;
  return {
    publicKey: pub,
    privateKey: priv,
    baseUrl: process.env.CLOUDRADIAL_BASE_URL || DEFAULT_BASE_URL,
  };
}

/**
 * Load credentials. Order: env vars → OS keychain. Returns null if neither is set.
 * Called per API request so setup-while-running works without restart.
 */
export function loadCredentials(): { creds: Credentials; source: CredentialSource } | null {
  const env = readEnv();
  if (env) return { creds: env, source: "env" };
  const kc = readKeychain();
  if (kc) return { creds: kc, source: "keychain" };
  return null;
}

export function getStatus(): CredentialStatus {
  const env = readEnv();
  if (env) {
    return {
      configured: true,
      source: "env",
      baseUrl: env.baseUrl,
      publicKeyHint: env.publicKey.slice(-4),
    };
  }
  const kc = readKeychain();
  if (kc) {
    return {
      configured: true,
      source: "keychain",
      baseUrl: kc.baseUrl,
      publicKeyHint: kc.publicKey.slice(-4),
    };
  }
  return { configured: false, source: null, baseUrl: null, publicKeyHint: null };
}

export function saveToKeychain(creds: Credentials): void {
  entry(KEY_PUBLIC).setPassword(creds.publicKey);
  entry(KEY_PRIVATE).setPassword(creds.privateKey);
  entry(KEY_BASE_URL).setPassword(creds.baseUrl || DEFAULT_BASE_URL);
}

export function clearKeychain(): void {
  for (const k of [KEY_PUBLIC, KEY_PRIVATE, KEY_BASE_URL]) {
    try { entry(k).deletePassword(); } catch { /* missing entry is fine */ }
  }
}

// ---------------------------------------------------------------------------
// ScalePad Lifecycle Manager credentials (optional; used by the ScalePad sync
// tools). Stored under the same keychain service, separate accounts. Auth to
// ScalePad is an `x-api-key` header (not Basic), so only a key + base URL.
// ---------------------------------------------------------------------------
const KEY_SP_API_KEY = "scalepad_api_key";
const KEY_SP_BASE_URL = "scalepad_base_url";

export interface ScalePadCredentials {
  apiKey: string;
  baseUrl: string;
}

export interface ScalePadStatus {
  configured: boolean;
  source: CredentialSource;
  baseUrl: string | null;
  /** Last 4 chars of the API key for confirmation — never the full key. */
  apiKeyHint: string | null;
}

function readScalePadKeychain(): ScalePadCredentials | null {
  try {
    const apiKey = entry(KEY_SP_API_KEY).getPassword();
    const baseUrl = entry(KEY_SP_BASE_URL).getPassword();
    if (!apiKey || !baseUrl) return null;
    return { apiKey, baseUrl };
  } catch {
    return null;
  }
}

function readScalePadEnv(): ScalePadCredentials | null {
  const apiKey = process.env.SCALEPAD_API_KEY;
  const baseUrl = process.env.SCALEPAD_API_URL || process.env.SCALEPAD_BASE_URL;
  if (!apiKey || !baseUrl) return null;
  return { apiKey, baseUrl };
}

export function loadScalePadCredentials(): { creds: ScalePadCredentials; source: CredentialSource } | null {
  const env = readScalePadEnv();
  if (env) return { creds: env, source: "env" };
  const kc = readScalePadKeychain();
  if (kc) return { creds: kc, source: "keychain" };
  return null;
}

export function getScalePadStatus(): ScalePadStatus {
  const loaded = loadScalePadCredentials();
  if (!loaded) return { configured: false, source: null, baseUrl: null, apiKeyHint: null };
  return {
    configured: true,
    source: loaded.source,
    baseUrl: loaded.creds.baseUrl,
    apiKeyHint: loaded.creds.apiKey.slice(-4),
  };
}

export function saveScalePadToKeychain(creds: ScalePadCredentials): void {
  entry(KEY_SP_API_KEY).setPassword(creds.apiKey);
  entry(KEY_SP_BASE_URL).setPassword(creds.baseUrl);
}

export function clearScalePadKeychain(): void {
  for (const k of [KEY_SP_API_KEY, KEY_SP_BASE_URL]) {
    try { entry(k).deletePassword(); } catch { /* missing entry is fine */ }
  }
}
