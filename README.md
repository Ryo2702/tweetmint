# TweetMint

An interactive, browser-local pixel social plaza built with React, Vite, PixiJS, Motion, GSAP, Zustand, and TanStack Query.

```sh
npm install
npm run dev
```

`npm test` exercises the local social-state rules, and `npm run build` creates the static production bundle.

## Runtime notes

The seeded plaza provides starter accounts, posts, comments, reactions, and token concepts. New posts and interactions are stored in the current browser. Solana deployment, prices, trades, and creator rewards require the corresponding server integrations; connected-wallet balances are read directly from the configured Solana RPC.

TweetMint does not call X or require API credentials. The Mint Station accepts a local post image and caption, saves both with the preserved asset, and keeps the image/caption available through the coin flow. Existing X URLs can still be restored from browser-local state when present.

Wallet connection uses the official Phantom and Solflare browser extensions through Wallet Standard discovery. Set `VITE_SOLANA_RPC_URL` to the Solana RPC endpoint for the selected network (and optionally `VITE_SOLANA_NETWORK=mainnet-beta|devnet|testnet`) for reliable SOL and SPL balance reads; the client falls back to Solana's public endpoint when unset.

The launch station prepares the preserved screenshot and metadata, opens `VITE_PUMPFUN_CREATE_URL` (default `https://pump.fun/create`), and never marks a token launched from the browser alone. Paste the mint returned by pump.fun; TweetMint marks it launched only after the configured Solana RPC confirms a Token Program account. A production deployment should replace browser-local source records/assets with authenticated object storage and an idempotent server-side canonical-post constraint.

To turn this into a production product, add an authenticated backend with PostgreSQL/Redis, durable object storage, a job queue and idempotent canonical-post constraint, Solana RPC/deployer configuration, and server-side wallet/creator-claim verification.
