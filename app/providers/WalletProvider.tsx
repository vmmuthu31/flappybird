"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { polygonAmoy } from "viem/chains";

const config = getDefaultConfig({
  appName: "Flappy Bird",
  projectId:
    process.env.NEXT_PUBLIC_RAINBOW_PROJECT_ID! ||
    "495316edb8104828cbd48aa201d635a8",
  chains: [polygonAmoy],
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
