import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Le service worker ne doit jamais être servi depuis un cache HTTP périmé
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
