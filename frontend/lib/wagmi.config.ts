import { configureChains, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { publicProvider } from 'wagmi/providers/public'

const projectId = '6faa50e8407956eac9e412449aefe8bd'

export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia],
  [publicProvider()]
)

export const config = createConfig({
  autoConnect: false,
  connectors: [
    new InjectedConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId,
        showQrModal: false,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})
