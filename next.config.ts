
import type {NextConfig} from 'next';

// Define a type that extends NextConfig to include your custom key
interface CustomNextConfig extends NextConfig {
  allowedDevOrigins?: string[];
}

const nextConfig: CustomNextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Allow your Cloud Workstation’s dev URL (or localhost) to connect:
  allowedDevOrigins: [
    "https://9003-firebase-studio-1749130740097.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev",
    // You can add "http://localhost:9002" here too if needed
  ],
};

export default nextConfig;
