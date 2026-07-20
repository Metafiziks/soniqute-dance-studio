"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!connectors || connectors.length === 0) {
    return <p className="text-sm text-white/60">No wallet connectors found.</p>;
  }

  // Helper for safely formatting the address
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "wallet";

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="inline-flex items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 transition"
      >
        Disconnect {shortAddress}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((c) => (
        <button
          key={c.id}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
          className="inline-flex items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Connecting…" : `Connect ${c.name}`}
        </button>
      ))}
    </div>
  );
}