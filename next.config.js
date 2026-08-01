/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDF生成でfs.readFileSyncするフォントファイルをVercelのサーバーレス関数バンドルに
  // 確実に含めるための設定（案A：pdf-lib + fontkit + Noto Sans JP対応）
  experimental: {
    outputFileTracingIncludes: {
      "/api/pdf/generate": ["./src/assets/fonts/**"],
    },
  },
};

module.exports = nextConfig;
