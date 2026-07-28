import type { NextConfig } from "next";

// IMPORTANT: If your GitHub repo name is NOT "vaultguard", change the basePath below
// to match your repo name. Example: if repo is "my-password-app", use basePath: "/my-password-app"
// If deploying to username.github.io (root, no subpath), remove basePath entirely.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/vaultguard",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure trailing slashes for GitHub Pages compatibility
  trailingSlash: true,
};

export default nextConfig;
