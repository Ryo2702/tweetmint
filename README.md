# TweetMint

An interactive, browser-local pixel social plaza built with React, Vite, PixiJS, Motion, GSAP, Zustand, and TanStack Query.

```sh
npm install
npm run dev
```

`npm test` exercises the local social-state rules, and `npm run build` creates the static production bundle.

## Runtime notes

The seeded plaza provides starter accounts, posts, comments, reactions, and token concepts. New posts and interactions are stored in the current browser. X lookup, Solana deployment, prices, trades, and creator rewards require the corresponding server integrations; connected-wallet balances are read directly from the configured Solana RPC.

X post retrieval uses the server-side Vite proxy at `GET /api/x/posts/:postId`. Put an X API Bearer Token in the local `.env` as `X_BEARER_TOKEN`; it is never exposed to the browser. The proxy calls X's single-post endpoint and returns a normalized preview after local URL parsing. `VITE_X_API_URL` can still point to an existing authenticated service exposing `GET /posts/:postId`, and `X_API_BASE_URL` is an optional server-side endpoint override for testing.

`X_ACCESS_KEY` and `X_ACCESS_TOKEN_SECRET` are OAuth 1.0a credentials, not a Bearer Token. They are not sent as a Bearer Token. Add the app's Bearer Token from the X Developer Console before testing live post retrieval.

Wallet connection uses the official Phantom and Solflare browser extensions through Wallet Standard discovery. Set `VITE_SOLANA_RPC_URL` to the Solana RPC endpoint for the selected network (and optionally `VITE_SOLANA_NETWORK=mainnet-beta|devnet|testnet`) for reliable SOL and SPL balance reads; the client falls back to Solana's public endpoint when unset.

To turn this into a production product, add an authenticated backend with PostgreSQL/Redis, official X API credentials, a job queue and idempotent canonical-post constraint, Solana RPC/deployer configuration, and server-side wallet/creator-claim verification.
