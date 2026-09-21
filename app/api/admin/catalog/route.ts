import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Écriture du catalogue : uniquement en local (npm run dev), jamais en production.
export const dynamic = "force-dynamic";

const isLocal = (req: Request) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.get("host") ?? "");

export async function PUT(req: Request) {
  if (process.env.NODE_ENV === "production" || !isLocal(req)) {
    return new Response("Interdit", { status: 403 });
  }
  const data = await req.json().catch(() => null);
  if (!data || !Array.isArray(data.custom) || (data.networks && !Array.isArray(data.networks)) || ["overrides", "blocked", "checks"].some((k) => typeof data[k] !== "object" || !data[k])) {
    return new Response("Format invalide", { status: 400 });
  }
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "catalog.json"), JSON.stringify(data, null, 2) + "\n");
  return Response.json({ ok: true });
}
