import { parseTarget } from "@/lib/proxy";

// Teste si un flux répond et envoie réellement de l'audio.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const target = parseTarget(req);
  if (!target) return Response.json({ ok: false, reason: "URL refusée" }, { status: 400 });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(target, {
      signal: ac.signal,
      redirect: "follow",
      headers: { "User-Agent": "LeMenestrel/1.0", Accept: "*/*" },
    });
    if (!res.ok || !res.body) return Response.json({ ok: false, reason: `HTTP ${res.status}` });
    const type = res.headers.get("content-type") ?? "";
    if (type.startsWith("text/html")) return Response.json({ ok: false, reason: "Page web, pas un flux audio" });
    const { value } = await res.body.getReader().read();
    if (!value?.length) return Response.json({ ok: false, reason: "Aucune donnée reçue" });
    return Response.json({ ok: true, reason: type });
  } catch {
    return Response.json({ ok: false, reason: ac.signal.aborted ? "Délai dépassé" : "Injoignable" });
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
}
