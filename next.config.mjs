/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Post photos: generated lazily by the URL itself, so next/image
      // has to be allowed to fetch and optimise from this host.
      { protocol: 'https', hostname: 'image.pollinations.ai' },
    ],
  },
};

export default nextConfig;
