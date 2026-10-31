import type { Language } from "./types";

/** Code + language + input, packed into the URL hash (#s=...) so a link opens the same program. */
export type Shared = { lang: Language; code: string; stdin: string };

const LANGS: Language[] = ["python", "java", "cpp", "c"];

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeShare(s: Shared): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ l: s.lang, c: s.code, i: s.stdin || undefined }));
  if (typeof CompressionStream === "undefined") return "j" + toBase64Url(json);
  return "z" + toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeShare(token: string): Promise<Shared | null> {
  try {
    const raw = fromBase64Url(token.slice(1));
    const bytes = token[0] === "z" ? await pipe(raw, new DecompressionStream("deflate-raw")) : raw;
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (!LANGS.includes(o.l) || typeof o.c !== "string") return null;
    return { lang: o.l, code: o.c, stdin: typeof o.i === "string" ? o.i : "" };
  } catch {
    return null;
  }
}

export function shareTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
