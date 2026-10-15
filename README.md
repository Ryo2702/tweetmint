# TweetMint

A local pixel community with hyperlinks to news, social platforms, wallets, and pump.fun.

```sh
npm install
npm run dev
```

`npm run build` produces a static site in `dist`; `npm start` previews that build.
`npm test` runs the local checks.

No API server, RSS ingestion, live sockets, wallet connection, balance requests, or on-chain verification is used. External sources open through hyperlinks. Community activity and preserved images stay in this browser's local storage. Token proposals and image downloads are prepared locally; connect your wallet and complete any actual launch on pump.fun. TweetMint does not track or confirm external launches.

Curated crypto news is stored in `src/data/cryptoNews.js`. Update the story links, publication dates, and snapshot date manually, then rebuild. The panel links to the publisher for newer coverage.
