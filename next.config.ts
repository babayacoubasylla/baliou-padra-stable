import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* @ts-ignore - Cette option est nécessaire pour le développement sur réseau local */
  allowedDevOrigins: ["localhost:3000", "192.168.1.24:3000"],
};

export default nextConfig;