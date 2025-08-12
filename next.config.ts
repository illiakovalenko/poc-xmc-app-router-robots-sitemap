import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  rewrites: async () => {
    return [
      {
        source: "/sitemap-:id(\\d+)\\.xml",
        destination: "/sitemap",
        locale: false,
      },
    ];
  }
};

export default nextConfig;
