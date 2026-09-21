import { isIP } from "node:net";

function isPrivateHost(host: string) {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (isIP(h) === 4) {
    const [a, b] = h.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (isIP(h.replace(/^\[|\]$/g, "")) === 6) return true;
  return false;
}

// Renvoie l'URL cible du paramètre ?url=, ou null si invalide / interdite (anti-SSRF).
export function parseTarget(req: Request): URL | null {
  try {
    const target = new URL(new URL(req.url).searchParams.get("url") ?? "");
    if (!["http:", "https:"].includes(target.protocol) || isPrivateHost(target.hostname)) return null;
    return target;
  } catch {
    return null;
  }
}
