"use client";

import { useCallback, useEffect, useState } from "react";

import { getDefaultClient } from "./StellarCredClient";
import type { Credential, LeaderboardEntry } from "./types";
import { ScoreTier } from "./types";
import { getScoreTier } from "./utils";
import { connectWallet, getPublicKey, isFreighterInstalled } from "./wallet";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export interface UseIdentityResult {
  credentials: Credential[];
  score: number;
  tier: ScoreTier;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Loads an address's full credential portfolio and reputation score from
 * the default StellarCred client (configured via `configureStellarCred`).
 */
export function useIdentity(address: string): UseIdentityResult {
  const client = getDefaultClient();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCredentials, fetchedScore] = await Promise.all([
        client.getCredentials(address),
        client.getScore(address),
      ]);
      setCredentials(fetchedCredentials);
      setScore(fetchedScore);
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, [client, address]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    credentials,
    score,
    tier: getScoreTier(score),
    isLoading,
    error,
    refetch,
  };
}

export interface UseCredentialResult {
  hasCredential: boolean;
  isLoading: boolean;
}

/**
 * Checks whether `address` holds a credential of `credentialType`.
 */
export function useCredential(
  address: string,
  credentialType: string,
): UseCredentialResult {
  const client = getDefaultClient();
  const [hasCredential, setHasCredential] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    client
      .hasCredential(address, credentialType)
      .then((result) => {
        if (!cancelled) {
          setHasCredential(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasCredential(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, address, credentialType]);

  return { hasCredential, isLoading };
}

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads the top `limit` wallets by reputation score.
 */
export function useLeaderboard(limit: number): UseLeaderboardResult {
  const client = getDefaultClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    client
      .getLeaderboard(limit)
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(toError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, limit]);

  return { entries, isLoading, error };
}

export interface UseWalletResult {
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

/**
 * Tracks the connected Freighter wallet's public key, auto-detecting an
 * already-authorized connection on mount.
 */
export function useWallet(): UseWalletResult {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    isFreighterInstalled()
      .then((installed) => {
        if (!installed || cancelled) {
          return null;
        }
        return getPublicKey();
      })
      .then((key) => {
        if (!cancelled && key) {
          setPublicKey(key);
        }
      })
      .catch(() => {
        // Freighter not installed or not yet authorized; leave disconnected.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const key = await connectWallet();
    setPublicKey(key);
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, []);

  return { publicKey, connect, disconnect, isConnected: publicKey !== null };
}
