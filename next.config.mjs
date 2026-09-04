/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "**.telegram.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Browsers already re-check a service worker script on every
        // navigation, but only *after* comparing bytes with whatever HTTP
        // caching this response already allows — without this, a CDN/proxy
        // in front of the app could hand out a stale sw.js for far longer
        // than that, so a device could be stuck on old avatar/logo caching
        // logic (see public/sw.js) well after a fix ships.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
