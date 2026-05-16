---
name: stratos-wallet
description: Read balances, addresses and transaction history from a Stratos multi-chain wallet, and (with explicit user confirmation) send transfers and sign messages. Use whenever the user asks about their crypto holdings, wallet activity, portfolio value, or wants to move funds.
metadata:
  requiredSecrets:
    - STRATOS_BASE_URL
    - STRATOS_API_KEY
    - STRATOS_API_SECRET
---

# Stratos Wallet

This skill connects the agent to a [Stratos](https://stratos-docs.pages.dev/developers/sdk-api)
multi-chain wallet (Canton, EVM, BTC, Tron, and more).

All wallet operations go through one bundled helper script. **Never** hand-craft
`curl` calls to the Stratos API — the helper keeps the API secret out of chat
history and handles the inconsistent response shapes Stratos returns.

## How to use it

Run the helper from the skill folder:

```
node skills/stratos-wallet/scripts/stratos.mjs <command> [flags]
```

Every invocation prints a single JSON object:

- success → `{ "ok": true, "command": "...", "result": { ... } }`
- failure → `{ "ok": false, "command": "...", "error": "...", "status": 401 }`

Always parse the JSON. If `ok` is `false`, tell the user what `error` says — do
not retry blindly, especially on `status` 401/403 (bad credentials) or 429
(rate limited — Stratos caps at 30 requests/minute).

## Commands

### Read operations (safe, no confirmation needed)

| Command | What it returns |
|---|---|
| `addresses` | Wallet addresses per chain |
| `balance` | Token balances across all chains |
| `transactions` | Recent transaction history |

```
node skills/stratos-wallet/scripts/stratos.mjs balance
node skills/stratos-wallet/scripts/stratos.mjs addresses
node skills/stratos-wallet/scripts/stratos.mjs transactions
```

`result.items` is a cleaned array. `result.raw` is the untouched Stratos
response — if `items` looks empty but the user insists they have funds, read
`raw` and report what it actually contains.

### Write operations (REQUIRE explicit user confirmation — see AGENTS.md)

**`transfer`** — send tokens. Never run this without the user confirming the
exact recipient, amount and symbol in their most recent message.

```
node skills/stratos-wallet/scripts/stratos.mjs transfer --to <address> --amount <number> --symbol <SYM> [--chain <chain>]
```

- `--symbol` examples: `CC` (Canton), `ETH`, `BTC`, `TRX`, `USDC`, `USDT`
- `--chain` is only needed for multi-chain tokens like USDC/USDT. For
  single-chain tokens the wallet infers it. Chains: `canton`, `evm`, `btc`,
  `tron`, `svm`, `ton`.

**`sign`** — sign an arbitrary message with a wallet key. Also requires
confirmation.

```
node skills/stratos-wallet/scripts/stratos.mjs sign --chain-type <evm|btc|tron|canton> --message "<text>"
```

## Token symbol → chain reference

| Symbol | Chain |
|---|---|
| `CC` | canton |
| `ETH`, `ETH_Base`, `ETH_Arb` | evm |
| `BTC` | btc |
| `TRX` | tron |
| `SOL` | svm |
| `TON` | ton |
| `USDC`, `USDT`, `DAI` | multi-chain — ask the user which chain |

## Reporting balances

When the user asks "what's my portfolio worth", show each holding's symbol and
amount, and the chain it sits on. Stratos does not return USD values — if the
user wants a USD total, look up spot prices for the major symbols (CC, ETH,
BTC, SOL, TRX) and note that stablecoins are ~$1. Always say the USD figure is
an estimate.

## Failure modes to expect

- **Not configured** — one of the three secrets is missing. Tell the user to
  set them in the agent's Secrets tab.
- **401 / 403** — the API key or secret is wrong. Don't retry.
- **429** — rate limited. Wait at least a minute before the next call.
- **Empty `items`** — fall back to reading `result.raw` before telling the
  user they have nothing.
