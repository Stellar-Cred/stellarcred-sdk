import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

import type {
  Credential,
  CredentialStats,
  IssueCredentialParams,
  Issuer,
  IssuerParams,
  LeaderboardEntry,
} from "./types";
import { getPublicKey, signTransaction } from "./wallet";

export type StellarCredNetwork = "testnet" | "mainnet" | "futurenet";

export interface StellarCredClientConfig {
  network: StellarCredNetwork;
  contractId: string;
  rpcUrl?: string;
}

const NETWORK_PASSPHRASES: Record<StellarCredNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
  futurenet: Networks.FUTURENET,
};

const DEFAULT_RPC_URLS: Record<StellarCredNetwork, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  mainnet: "https://mainnet.sorobanrpc.com",
  futurenet: "https://rpc-futurenet.stellar.org",
};

const TRANSACTION_TIMEOUT_SECONDS = 30;
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 20;

function toScAddress(value: string): xdr.ScVal {
  return new Address(value).toScVal();
}

function toScString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

function toScStringVec(values: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(values.map(toScString));
}

function toScU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

interface RawCredential {
  recipient: string;
  credential_type: string;
  issuer: string;
  issued_at: bigint;
  metadata: string;
}

function mapCredential(raw: RawCredential): Credential {
  return {
    recipient: raw.recipient,
    credentialType: raw.credential_type,
    issuer: raw.issuer,
    issuedAt: new Date(Number(raw.issued_at) * 1000),
    metadata: raw.metadata,
  };
}

interface RawIssuer {
  address: string;
  name: string;
  credential_types: string[];
  registered_at: bigint;
  active: boolean;
}

function mapIssuer(raw: RawIssuer): Issuer {
  return {
    address: raw.address,
    name: raw.name,
    credentialTypes: raw.credential_types,
    registeredAt: new Date(Number(raw.registered_at) * 1000),
    active: raw.active,
  };
}

interface RawLeaderboardEntry {
  address: string;
  score: number;
  credential_count: number;
}

function mapLeaderboardEntry(raw: RawLeaderboardEntry): LeaderboardEntry {
  return {
    address: raw.address,
    score: raw.score,
    credentialCount: raw.credential_count,
  };
}

interface RawCredentialStats {
  total_issued: number;
  by_type: Map<string, number>;
}

function mapCredentialStats(raw: RawCredentialStats): CredentialStats {
  return {
    totalIssued: raw.total_issued,
    byType: Object.fromEntries(raw.by_type),
  };
}

/**
 * Client for reading and writing StellarCred on-chain reputation data.
 *
 * Read methods simulate a contract call directly against the configured
 * RPC endpoint and require no connected wallet. Write methods build,
 * simulate, and submit a transaction signed by the currently connected
 * Freighter wallet — call {@link connectWallet} first.
 */
export class StellarCredClient {
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly networkPassphrase: string;
  private readonly readerKeypair: Keypair;

  constructor(config: StellarCredClientConfig) {
    this.networkPassphrase = NETWORK_PASSPHRASES[config.network];
    this.server = new rpc.Server(
      config.rpcUrl ?? DEFAULT_RPC_URLS[config.network],
    );
    this.contract = new Contract(config.contractId);
    this.readerKeypair = Keypair.random();
  }

  /** Returns every credential currently held by `address`. */
  async getCredentials(address: string): Promise<Credential[]> {
    const raw = await this.simulateRead<RawCredential[]>("get_credentials", [
      toScAddress(address),
    ]);
    return raw.map(mapCredential);
  }

  /** Computes a wallet's 0-1000 reputation score. */
  async getScore(address: string): Promise<number> {
    return this.simulateRead<number>("get_score", [toScAddress(address)]);
  }

  /** Checks whether a wallet holds a credential of `credentialType`. */
  async hasCredential(
    address: string,
    credentialType: string,
  ): Promise<boolean> {
    return this.simulateRead<boolean>("has_credential", [
      toScAddress(address),
      toScString(credentialType),
    ]);
  }

  /**
   * Issues a soul-bound credential. The connected Freighter wallet must
   * match `params.issuer` and be an active, registered issuer authorized
   * for `params.credentialType`.
   */
  async issueCredential(
    params: IssueCredentialParams,
  ): Promise<{ txHash: string }> {
    const source = await getPublicKey();
    return this.invokeWrite("issue_credential", source, [
      toScAddress(params.issuer),
      toScAddress(params.recipient),
      toScString(params.credentialType),
      toScString(params.metadata),
    ]);
  }

  /**
   * Revokes a credential. The connected Freighter wallet must match
   * `issuer` and must be the address that originally issued it.
   */
  async revokeCredential(
    issuer: string,
    recipient: string,
    credentialType: string,
  ): Promise<{ txHash: string }> {
    const source = await getPublicKey();
    return this.invokeWrite("revoke_credential", source, [
      toScAddress(issuer),
      toScAddress(recipient),
      toScString(credentialType),
    ]);
  }

  /**
   * Registers a new authorized credential issuer. The connected Freighter
   * wallet is used as both the transaction source and the contract admin.
   */
  async registerIssuer(params: IssuerParams): Promise<{ txHash: string }> {
    const admin = await getPublicKey();
    return this.invokeWrite("register_issuer", admin, [
      toScAddress(admin),
      toScAddress(params.issuer),
      toScString(params.name),
      toScStringVec(params.credentialTypes),
    ]);
  }

  /** Lists every registered issuer, active and inactive. */
  async getIssuers(): Promise<Issuer[]> {
    const raw = await this.simulateRead<RawIssuer[]>("get_issuers", []);
    return raw.map(mapIssuer);
  }

  /** Returns a single issuer's registration record. */
  async getIssuer(address: string): Promise<Issuer> {
    const raw = await this.simulateRead<RawIssuer>("get_issuer", [
      toScAddress(address),
    ]);
    return mapIssuer(raw);
  }

  /**
   * Sets the point value awarded for holding a credential of
   * `credentialType`. The connected Freighter wallet is used as both the
   * transaction source and the contract admin.
   */
  async setCredentialWeight(
    credentialType: string,
    weight: number,
  ): Promise<{ txHash: string }> {
    const admin = await getPublicKey();
    return this.invokeWrite("set_credential_weight", admin, [
      toScAddress(admin),
      toScString(credentialType),
      toScU32(weight),
    ]);
  }

  /** Returns the point value for a credential type. */
  async getCredentialWeight(credentialType: string): Promise<number> {
    return this.simulateRead<number>("get_credential_weight", [
      toScString(credentialType),
    ]);
  }

  /** Returns the top `limit` wallets by reputation score, highest first. */
  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const raw = await this.simulateRead<RawLeaderboardEntry[]>(
      "get_leaderboard",
      [toScU32(limit)],
    );
    return raw.map(mapLeaderboardEntry);
  }

  /** Returns aggregate credential-issuance counts, total and per type. */
  async getCredentialStats(): Promise<CredentialStats> {
    const raw = await this.simulateRead<RawCredentialStats>(
      "get_credential_stats",
      [],
    );
    return mapCredentialStats(raw);
  }

  /**
   * Convenience helper: returns whether `address`'s reputation score meets
   * or exceeds `minScore`. Useful for gating access in a dApp.
   */
  async verifyAndGate(address: string, minScore: number): Promise<boolean> {
    const score = await this.getScore(address);
    return score >= minScore;
  }

  private async simulateRead<T>(
    method: string,
    args: xdr.ScVal[],
  ): Promise<T> {
    const account = new Account(this.readerKeypair.publicKey(), "0");
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(
        `StellarCred: simulation of "${method}" failed — ${simulated.error}`,
      );
    }
    if (!simulated.result) {
      throw new Error(
        `StellarCred: simulation of "${method}" returned no result`,
      );
    }

    return scValToNative(simulated.result.retval) as T;
  }

  private async invokeWrite(
    method: string,
    sourcePublicKey: string,
    args: xdr.ScVal[],
  ): Promise<{ txHash: string }> {
    const account = await this.server.getAccount(sourcePublicKey);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);
    const signedXdr = await signTransaction(prepared.toXDR(), {
      networkPassphrase: this.networkPassphrase,
    });
    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr,
      this.networkPassphrase,
    );

    const sendResponse = await this.server.sendTransaction(signedTransaction);
    if (sendResponse.status === "ERROR") {
      throw new Error(
        `StellarCred: failed to submit "${method}" transaction`,
      );
    }

    await this.pollTransaction(sendResponse.hash);
    return { txHash: sendResponse.hash };
  }

  private async pollTransaction(hash: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const response = await this.server.getTransaction(hash);
      if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return;
      }
      if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`StellarCred: transaction ${hash} failed`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(`StellarCred: transaction ${hash} did not confirm in time`);
  }
}

let defaultClient: StellarCredClient | null = null;

/**
 * Creates and registers a module-level default {@link StellarCredClient}
 * used by the SDK's React hooks (`useIdentity`, `useCredential`,
 * `useLeaderboard`). Call this once during app startup.
 */
export function configureStellarCred(
  config: StellarCredClientConfig,
): StellarCredClient {
  defaultClient = new StellarCredClient(config);
  return defaultClient;
}

/**
 * Returns the default client registered via {@link configureStellarCred}.
 * Throws if none has been configured yet.
 */
export function getDefaultClient(): StellarCredClient {
  if (!defaultClient) {
    throw new Error(
      "StellarCred: no client configured. Call configureStellarCred() before using the hooks.",
    );
  }
  return defaultClient;
}
