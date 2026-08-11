import * as freighter from "@stellar/freighter-api";

/**
 * Returns whether the Freighter browser extension is installed and
 * reachable in the current environment.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    return await freighter.isConnected();
  } catch {
    return false;
  }
}

/**
 * Prompts the user to grant this site access to their Freighter wallet and
 * returns the selected public key (G... address).
 */
export async function connectWallet(): Promise<string> {
  try {
    return await freighter.requestAccess();
  } catch (err) {
    throw new Error(
      `StellarCred: failed to connect Freighter wallet — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Returns the public key (G... address) of the currently connected
 * Freighter wallet. Throws if Freighter is not installed or not connected.
 */
export async function getPublicKey(): Promise<string> {
  try {
    return await freighter.getPublicKey();
  } catch (err) {
    throw new Error(
      `StellarCred: failed to read Freighter address — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export interface SignTransactionOptions {
  networkPassphrase: string;
}

/**
 * Requests a Freighter signature for a base64-encoded transaction XDR and
 * returns the signed transaction XDR.
 */
export async function signTransaction(
  xdr: string,
  options: SignTransactionOptions,
): Promise<string> {
  try {
    return await freighter.signTransaction(xdr, {
      networkPassphrase: options.networkPassphrase,
    });
  } catch (err) {
    throw new Error(
      `StellarCred: failed to sign transaction — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
