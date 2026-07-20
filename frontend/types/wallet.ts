// types/wallet.ts
// Centralized wallet types to avoid conflicts

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  disconnect?: () => Promise<void>;
  selectedAddress?: string | null;
  accounts?: string[];
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  _metamask?: {
    emit?: (event: string, data: any) => void;
    isUnlocked?: () => Promise<boolean>;
  };
}

export interface WalletConnectProvider {
  disconnect: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    walletconnect?: WalletConnectProvider;
  }
}

export {};