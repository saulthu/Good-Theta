import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const baseConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(baseConfig);
