<p align="center">
  <img src="docs/logo.png" alt="StellarCred logo" width="120">
</p>

# @stellar-cred/sdk

**TypeScript SDK for StellarCred — on-chain behavioral reputation and credentials on Stellar Soroban**

![npm](https://img.shields.io/npm/v/@stellar-cred/sdk)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Drips Wave](https://img.shields.io/badge/Drips-Wave-F59E0B)

**Live app:** [stellarcred-app.vercel.app](https://stellarcred-app.vercel.app/)

`@stellar-cred/sdk` wraps the [StellarCred](https://github.com/Stellar-Cred/stellarcred-contracts)
Soroban contract so any Stellar dApp can read wallet reputation scores,
query credentials, and (for authorized issuers) mint or revoke credentials
— with a Freighter wallet adapter and a set of React hooks included.

## Installation

```bash
npm install @stellar-cred/sdk
```

`react` is an optional peer dependency, only required if you use the hooks
exported from this package.

## Quick Start

```ts
import { StellarCredClient, ScoreTier } from "@stellar-cred/sdk";

const client = new StellarCredClient({
  network: "testnet",
  contractId: "CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
});

// Read a wallet's full credential portfolio and score
const credentials = await client.getCredentials("GABC...WXYZ");
const score = await client.getScore("GABC...WXYZ");

// Check a specific credential
const isVerified = await client.hasCredential("GABC...WXYZ", "Verified");

// Gate access by minimum reputation
const canProceed = await client.verifyAndGate("GABC...WXYZ", 500);

// Issuing a credential requires a connected Freighter wallet matching
// the `issuer` address, and that address must be an active, registered
// StellarCred issuer authorized for this credential type.
import { connectWallet } from "@stellar-cred/sdk";

const issuerAddress = await connectWallet();
const { txHash } = await client.issueCredential({
  issuer: issuerAddress,
  recipient: "GABC...WXYZ",
  credentialType: "PaymentRecord",
  metadata: "invoice #4821",
});
```

## React Hooks

Hooks are exported from the `@stellar-cred/sdk/hooks` subpath, not the main
entry point — this keeps the main entry free of React's `useState`/
`useEffect`, so pure functions like `credentialIcon` or `truncateAddress`
can be imported into React Server Components without tripping a "Client
Component" boundary error. `@stellar-cred/sdk/hooks` is built with a
`"use client"` directive.

Configure a default client once during app startup, then use the hooks
anywhere in your component tree:

```tsx
import { configureStellarCred } from "@stellar-cred/sdk";
import { useIdentity, useCredential, useLeaderboard } from "@stellar-cred/sdk/hooks";

configureStellarCred({
  network: "testnet",
  contractId: "CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
});

function Profile({ address }: { address: string }) {
  const { credentials, score, tier, isLoading, error, refetch } = useIdentity(address);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Failed to load: {error.message}</p>;

  return (
    <div>
      <p>Score: {score} / 1000 ({tier})</p>
      <ul>
        {credentials.map((c) => (
          <li key={c.credentialType}>{c.credentialType}</li>
        ))}
      </ul>
    </div>
  );
}

function VerifiedBadge({ address }: { address: string }) {
  const { hasCredential, isLoading } = useCredential(address, "Verified");
  if (isLoading) return null;
  return hasCredential ? <span>✅ Verified</span> : null;
}

function Leaderboard() {
  const { entries, isLoading } = useLeaderboard(100);
  if (isLoading) return <p>Loading...</p>;
  return (
    <ol>
      {entries.map((e) => (
        <li key={e.address}>{e.address}: {e.score}</li>
      ))}
    </ol>
  );
}
```

## API Reference

| Method | Description | Parameters | Returns |
|---|---|---|---|
| `getCredentials` | Returns all credentials held by a wallet | `address` | `Promise<Credential[]>` |
| `getScore` | Computes a wallet's 0-1000 reputation score | `address` | `Promise<number>` |
| `hasCredential` | Checks whether a wallet holds a given credential type | `address, credentialType` | `Promise<boolean>` |
| `issueCredential` | Mints a soul-bound credential (requires connected issuer wallet) | `IssueCredentialParams` | `Promise<{ txHash: string }>` |
| `revokeCredential` | Revokes a credential (requires connected original-issuer wallet) | `issuer, recipient, credentialType` | `Promise<{ txHash: string }>` |
| `registerIssuer` | Registers a new authorized issuer (requires connected admin wallet) | `IssuerParams` | `Promise<{ txHash: string }>` |
| `getIssuers` | Lists every registered issuer | — | `Promise<Issuer[]>` |
| `getIssuer` | Returns a single issuer's record | `address` | `Promise<Issuer>` |
| `setCredentialWeight` | Sets a credential type's point value (requires connected admin wallet) | `credentialType, weight` | `Promise<{ txHash: string }>` |
| `getCredentialWeight` | Returns a credential type's point value | `credentialType` | `Promise<number>` |
| `getLeaderboard` | Returns the top N wallets by score | `limit` | `Promise<LeaderboardEntry[]>` |
| `getCredentialStats` | Returns aggregate issuance counts, total and per type | — | `Promise<CredentialStats>` |
| `verifyAndGate` | Returns whether a wallet's score meets a minimum threshold | `address, minScore` | `Promise<boolean>` |

## Score Tiers

| Tier | Score Range | Description |
|---|---|---|
| Newcomer | 0-99 | No or minimal on-chain reputation yet |
| Bronze | 100-299 | Early on-chain activity established |
| Silver | 300-499 | Consistent, verified activity |
| Gold | 500-699 | Strong, diverse on-chain history |
| Platinum | 700-899 | High-trust wallet with broad credential coverage |
| Diamond | 900-1000 | Maximum reputation, including a `Verified` attestation |

## Contributing via Drips Wave

This repo participates in the [Drips Stellar Wave](https://www.drips.network/wave/stellar).
Open issues are tagged `complexity: trivial`, `complexity: medium`, or
`complexity: high` with a Point value attached. See
[CONTRIBUTING.md](CONTRIBUTING.md) before picking up an issue — in
particular, **do not start work until you've been assigned**.
