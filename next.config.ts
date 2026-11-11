import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Liens courts à mettre dans les bios et les messages : ils disent d'où vient la visite
  async redirects() {
    return [
      { source: "/ig", destination: "/?de=instagram", permanent: false },
      { source: "/tt", destination: "/?de=tiktok", permanent: false },
      { source: "/wa", destination: "/?de=whatsapp", permanent: false },
    ];
  },
};

export default nextConfig;
