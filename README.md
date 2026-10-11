# TweetMint

An interactive, browser-local pixel social plaza built with React, Vite, PixiJS, Motion, GSAP, Zustand, and TanStack Query.

```sh
npm install
npm run dev
```

`npm test` exercises the local social-state rules, and `npm run build` creates the static production bundle.

## Demo boundary

The seeded community, posts, comments, reactions, and token concepts are deliberately fictional. New posts and interactions are stored only in the current browser. The app does not claim X lookup, on-chain deployment, prices, balances, trades, or creator rewards.

To turn this into a production product, add an authenticated backend with PostgreSQL/Redis, official X API credentials, a job queue and idempotent canonical-post constraint, Solana RPC/deployer configuration, and server-side wallet/creator-claim verification.
