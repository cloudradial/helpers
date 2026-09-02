import { loadScalePadCredentials } from "./credentials.js";

function getScalePadContext(): { apiKey: string; baseUrl: string } {
  const loaded = loadScalePadCredentials();
  if (!loaded) {
    throw new Error(
      "ScalePad credentials not configured. Run the `configure_scalepad_credentials` tool first."
    );
  }
  return { apiKey: loaded.creds.apiKey, baseUrl: loaded.creds.baseUrl.replace(/\/+$/, "") };
}

export interface ScalePadResult {
  status: number;
  data: unknown;
}

/**
 * Call the ScalePad Core / Lifecycle Manager API. Auth is the `x-api-key`
 * header. `query` values are appended as-is (ScalePad uses bracketed filter
 * params like `filter[client_id]=eq:123`, so keys are not encoded — only values).
 */
export async function callScalePad(
  method: string,
  path: string,
  query?: Record<string, string | undefined>
): Promise<ScalePadResult> {
  const { apiKey, baseUrl } = getScalePadContext();
  let url = baseUrl + (path.startsWith("/") ? path : `/${path}`);
  if (query) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === "") continue;
      parts.push(`${k}=${encodeURIComponent(v)}`);
    }
    if (parts.length) url += (url.includes("?") ? "&" : "?") + parts.join("&");
  }
  const resp = await fetch(url, {
    method,
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  let data: unknown = null;
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await resp.json();
  } else {
    const text = await resp.text();
    data = text || null;
  }
  return { status: resp.status, data };
}

/** Pull every page of a ScalePad list endpoint, following the cursor. */
export async function scalePadListAll(
  path: string,
  query: Record<string, string | undefined>,
  maxPages = 50
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let cursor: string | undefined;
  let page = 0;
  do {
    page++;
    const q = { ...query, page_size: query.page_size ?? "200", cursor };
    const { status, data } = await callScalePad("GET", path, q);
    if (status === 402) {
      throw new Error(
        "ScalePad returned HTTP 402 — a paid Lifecycle Manager subscription is required for lifecycle endpoints."
      );
    }
    if (status < 200 || status >= 300) {
      throw new Error(`ScalePad ${path} failed (HTTP ${status}): ${JSON.stringify(data).slice(0, 200)}`);
    }
    const pageRows = extractArray(data);
    rows.push(...pageRows);
    cursor = extractCursor(data);
  } while (cursor && page < maxPages);
  return rows;
}

function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown> | null;
  if (d && Array.isArray(d.data)) return d.data as unknown[];
  if (d && Array.isArray(d.value)) return d.value as unknown[];
  return [];
}

function extractCursor(data: unknown): string | undefined {
  const d = data as Record<string, unknown> | null;
  if (!d) return undefined;
  // Common shapes across ScalePad responses. >>CONFIRM against a live response.
  for (const k of ["next_cursor", "cursor"]) {
    const v = d[k];
    if (typeof v === "string" && v) return v;
  }
  const links = d.links as Record<string, unknown> | undefined;
  if (links && typeof links.next === "string" && links.next) return links.next as string;
  const meta = d.meta as Record<string, unknown> | undefined;
  if (meta && typeof meta.next_cursor === "string" && meta.next_cursor) return meta.next_cursor as string;
  return undefined;
}

/** A normalized ScalePad hardware/lifecycle asset. */
export interface ScalePadAsset {
  serialNumber: string | null;
  name: string | null;
  manufacturer: string | null;
  model: string | null;
  warrantyExpiry: string | null;
  purchaseDate: string | null;
  os: string | null;
  osVersion: string | null;
  memoryBytes: number | null;
  isSSD: boolean | null;
  antiVirus: string | null;
}

function firstProp(o: unknown, names: string[]): unknown {
  if (!o || typeof o !== "object") return undefined;
  const obj = o as Record<string, unknown>;
  for (const n of names) {
    const v = obj[n];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function asString(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "object") {
    // e.g. manufacturer: { name: "Lenovo" }
    const inner = firstProp(v, ["name", "value", "display"]);
    return inner != null ? String(inner) : null;
  }
  return String(v);
}

/**
 * Map a raw ScalePad hardware record to the normalized shape. Field names are
 * read defensively across the likely spellings ScalePad uses — >>CONFIRM the
 * exact keys against a live response (https://developer.scalepad.com/reference).
 */
export function normalizeScalePadAsset(raw: unknown): ScalePadAsset {
  const serial = asString(firstProp(raw, ["serial_number", "serialNumber", "serial"]));
  const mem = firstProp(raw, ["memory_bytes", "ram_bytes", "memory", "ram"]);
  const ssd = firstProp(raw, ["is_ssd", "isSSD", "ssd", "has_ssd"]);
  return {
    serialNumber: serial ? serial.trim() : null,
    name: asString(firstProp(raw, ["hostname", "name", "asset_name", "device_name", "computer_name"])),
    manufacturer: asString(firstProp(raw, ["manufacturer", "manufacturer_name", "make"])),
    model: asString(firstProp(raw, ["model", "model_name"])),
    warrantyExpiry: asString(
      firstProp(raw, [
        "warranty_expiration_date",
        "warranty_expiry",
        "warrantyExpiration",
        "warranty_expires_at",
        "warranty_end_date",
        "estimated_replacement_date",
      ])
    ),
    purchaseDate: asString(firstProp(raw, ["purchase_date", "purchased_at", "purchaseDate", "acquired_at"])),
    os: asString(firstProp(raw, ["operating_system", "os", "os_name"])),
    osVersion: asString(firstProp(raw, ["os_version", "osVersion", "os_build"])),
    memoryBytes: mem != null && !isNaN(Number(mem)) ? Number(mem) : null,
    isSSD: typeof ssd === "boolean" ? ssd : null,
    antiVirus: asString(firstProp(raw, ["antivirus", "endpoint_protection", "av_product", "protection_product"])),
  };
}

export function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  const t = Date.parse(d);
  if (isNaN(t)) return d;
  return new Date(t).toISOString().slice(0, 10); // yyyy-MM-dd
}
