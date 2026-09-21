import { parseTarget } from "@/lib/proxy";

// Proxy de flux audio : contourne le CORS pour pouvoir enregistrer les radios.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const target = parseTarget(req);
  if (!target) return new Response("URL refusée", { status: 400 });

  try {
    const upstream = await fetch(target, {
      signal: req.signal,
      redirect: "follow",
      headers: { "User-Agent": "LeMenestrel/1.0", Accept: "*/*" },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Flux indisponible", { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Flux injoignable", { status: 502 });
  }
}
