# TweetMint

An interactive, browser-local pixel social plaza built with React, Vite, PixiJS, Motion, GSAP, Zustand, and TanStack Query.

```sh
npm install
npm run dev
```

`npm test` exercises the local social-state rules, and `npm run build` creates the static production bundle.

## Runtime notes

The seeded plaza provides starter accounts, posts, comments, reactions, and token concepts. New posts and interactions are stored in the current browser. X lookup, Solana deployment, prices, trades, and creator rewards require the corresponding server integrations; connected-wallet balances are read directly from the configured Solana RPC.

Set `VITE_X_API_URL` to an authenticated service exposing `GET /posts/:postId` to enable X post retrieval after local URL parsing.

Wallet connection uses the official Phantom and Solflare browser extensions through Wallet Standard discovery. Set `VITE_SOLANA_RPC_URL` to the Solana RPC endpoint for the selected network (and optionally `VITE_SOLANA_NETWORK=mainnet-beta|devnet|testnet`) for reliable SOL and SPL balance reads; the client falls back to Solana's public endpoint when unset.

To turn this into a production product, add an authenticated backend with PostgreSQL/Redis, official X API credentials, a job queue and idempotent canonical-post constraint, Solana RPC/deployer configuration, and server-side wallet/creator-claim verification.
