import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPwa = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const baseConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPwa(baseConfig);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
