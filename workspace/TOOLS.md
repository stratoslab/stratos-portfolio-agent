# Tools & Environment

## The Stratos wallet skill

The `stratos-wallet` skill lives at `skills/stratos-wallet/`. It is the only
correct way to touch the wallet. Full instructions are in
`skills/stratos-wallet/SKILL.md` — read that before using it.

Quick reference:

```
node skills/stratos-wallet/scripts/stratos.mjs addresses
node skills/stratos-wallet/scripts/stratos.mjs balance
node skills/stratos-wallet/scripts/stratos.mjs transactions
node skills/stratos-wallet/scripts/stratos.mjs transfer --to <addr> --amount <n> --symbol <SYM> [--chain <chain>]
node skills/stratos-wallet/scripts/stratos.mjs sign --chain-type <evm|btc|tron|canton> --message "<text>"
```

The script is plain Node.js with **no dependencies** — it uses the built-in
`fetch`. Nothing to install.

## Environment

- Node.js and Python are available in the workspace.
- Three secrets must be set for the wallet to work (see BOOTSTRAP.md):
  `STRATOS_BASE_URL`, `STRATOS_API_KEY`, `STRATOS_API_SECRET`. They are exposed
  to the script as environment variables.

## Price lookups

Stratos returns balances in native units only — no USD. For a USD estimate,
look up spot prices yourself (e.g. a public price API) for the major symbols
(CC, ETH, BTC, SOL, TRX). Stablecoins (USDC, USDT, DAI) are ~$1. Always label
USD figures as estimates.

## What you do NOT have

- No trading venue, no DEX, no swap capability — this agent reports and
  transfers, it does not trade.
- No second wallet. One Stratos wallet, one set of credentials.
