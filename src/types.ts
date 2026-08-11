/**
 * A single soul-bound credential held by a wallet.
 */
export interface Credential {
  recipient: string;
  credentialType: string;
  issuer: string;
  issuedAt: Date;
  metadata: string;
}

/**
 * A protocol authorized to issue one or more credential types.
 */
export interface Issuer {
  address: string;
  name: string;
  credentialTypes: string[];
  registeredAt: Date;
  active: boolean;
}

/**
 * A single row on the StellarCred reputation leaderboard.
 */
export interface LeaderboardEntry {
  address: string;
  score: number;
  credentialCount: number;
}

/**
 * Aggregate counts of credentials issued across the protocol.
 */
export interface CredentialStats {
  totalIssued: number;
  byType: Record<string, number>;
}

/**
 * Parameters for registering a new credential issuer.
 */
export interface IssuerParams {
  issuer: string;
  name: string;
  credentialTypes: string[];
}

/**
 * Parameters for issuing a credential to a wallet.
 */
export interface IssueCredentialParams {
  issuer: string;
  recipient: string;
  credentialType: string;
  metadata: string;
}

/**
 * Reputation tiers derived from a wallet's 0-1000 StellarCred score.
 */
export enum ScoreTier {
  Newcomer = "Newcomer",
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Platinum = "Platinum",
  Diamond = "Diamond",
}
