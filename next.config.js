/** @type {import('next').NextConfig} */
const nextConfig = {
  // React StrictModeを無効化（VRMViewerの安定性のため）
  reactStrictMode: false,
  
  // 他の設定
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

module.exports = nextConfig;