"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";

import { type Chain } from "viem";

export const shardeumEvmTestnet = {
  id: 8119,
  name: "Shardeum EVM Testnet",
  nativeCurrency: { name: "Shardeum", symbol: "SHM", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api-mezame.shardeum.org"] },
  },
  blockExplorers: {
    default: {
      name: "Shardeum Explorer",
      url: "https://explorer-mezame.shardeum.org",
    },
  },
} as const satisfies Chain;

const config = getDefaultConfig({
  appName: "Flappy Bird",
  projectId: process.env.NEXT_PUBLIC_RAINBOW_PROJECT_ID!,
  chains: [shardeumEvmTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
