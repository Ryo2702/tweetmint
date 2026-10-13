# TweetMint

An interactive pixel social plaza built with React, Vite, PixiJS, GSAP, Zustand, and a Node.js news discovery backend. Requires Node.js 22.13 or later for native SQLite.

```sh
npm install
npm run dev
```

`npm run dev` starts the API on 8787 and Vite on 5173; Vite proxies `/api` and the live WebSocket. `npm test` exercises parsing, ingestion, persistence, API validation, launch proofs, and the existing social-state rules. `npm run build && npm start` serves the production bundle and API together. Copy `.env.example` to `.env` to configure ports/origins and RPC; leave secrets out of `VITE_` variables.

## Runtime notes

The main feed centrally ingests real Google News topical RSS metadata every 10 minutes. Public Bluesky AppView searches and official Bluesky author posts are attempted every 15 minutes; some providers deny unauthenticated searches, which appears as a source failure with cached data and exponential backoff. No authentication restrictions are bypassed. Refresh requests respect source schedules, ETags, Last-Modified, and Retry-After. Browsers receive genuinely new IDs and fictional plaza activity over `/api/feed/live`; each visitor does not fetch the internet directly.

Every external card retains the actual publisher/platform, original publication time, discovered time, source URL, availability, and categories. Google RSS links are often publisher redirects; unresolved links remain labeled source redirects. Summaries contain only short supplied excerpts where enabled, never full articles. Third-party images are disabled by default because inclusion in an RSS response does not establish reuse permission. Editorial labels are cues from feed tags/headlines, not independent verification. Political headlines retain their attribution and characters add neutral fictional commentary.

Direct CoinDesk, Cointelegraph, and Decrypt RSS adapters exist but are disabled until publisher redistribution permission is configured with `LICENSED_RSS_SOURCES`. They are validated as RSS/Atom before becoming ready. Decrypt's current terms restrict automated collection; do not enable it without permission. Sources and failures are visible in the feed. Failure never creates fictional news, and cached articles retain their publication times.

TweetMint does not search or scrape X. `/api/feed/x` accepts a visitor's valid X status URL and produces an honestly labeled source-link card with no invented author, post text, timestamp, or engagement. An unavailable official embed falls back to the original link. X routes identify a status ID; other platforms and news keep their own identifiers. The existing independent fictional community, local uploads, screenshot preservation, and pixel world remain available.

SQLite at `FEED_DB_PATH` stores source state, stories, visitor and explicitly fictional engagement, comments, bookmarks, announcements, and verified launch records. Anonymous visitors receive a SameSite HttpOnly cookie; comments/shares/reactions persist across visits while that cookie remains. UTC defines the daily discovery counters. All displayed engagement is TweetMint activity, never external engagement. Back up the SQLite database and its WAL consistently before moving the service. Only one ingestion process should own each database.

Wallet connection uses the official Phantom and Solflare browser extensions through Wallet Standard discovery. Set `VITE_SOLANA_RPC_URL` to the Solana RPC endpoint for the selected network (and optionally `VITE_SOLANA_NETWORK=mainnet-beta|devnet|testnet`) for reliable SOL and SPL balance reads; the client falls back to Solana's public endpoint when unset.

The launch station prepares the preserved screenshot/authorized upload and metadata and opens `VITE_PUMPFUN_CREATE_URL` (default `https://pump.fun/create`). No discovery action creates or signs a transaction. After explicitly launching through pump.fun, submit the mint and creation transaction signature and approve a session-bound wallet ownership message. The server verifies the message, a recent successful mainnet transaction signed by that wallet, initialized Token/Token-2022 mint, matching pump.fun create instruction, creator, name, and ticker before recording or announcing a coin. A unique source/mint/transaction constraint prevents repeat launches from being counted. Source association is recorded in TweetMint; it does not prove publisher endorsement or image rights.

For deployment set `HOST=0.0.0.0`, `APP_ORIGIN` to the public HTTPS origin, `COOKIE_SECURE=1`, and a reliable private server `SOLANA_RPC_URL`. Terminate TLS at your reverse proxy and forward WebSocket upgrades. Visitor identity remains anonymous; local screenshots and the independent community remain browser-local. Publisher permissions, durable upload storage, authenticated moderation, and multi-process ingestion coordination require deployment-specific setup.
