/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@deck.gl/react",
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/aggregation-layers",
  ],
};

export default nextConfig;
