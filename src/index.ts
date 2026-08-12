export * from "./types";
export * from "./StellarCredClient";
export * from "./wallet";
export * from "./utils";

// React hooks are intentionally NOT re-exported here. They pull in
// `useState`/`useEffect`, which trips Next.js's Server Component boundary
// check even for consumers who only import pure functions (e.g.
// `credentialIcon`) from this package. Import hooks from
// "@stellar-cred/sdk/hooks" instead, which is built as its own
// "use client" entry point.
