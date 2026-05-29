import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor Node mínimo para a VPS "A" (D3/ADR-0003): empacota só o necessário.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
