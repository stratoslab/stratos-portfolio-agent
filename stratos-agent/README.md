# Strat — Stratos Portfolio Agent 💼

A Pinata OpenClaw [agent template](https://docs.pinata.cloud/agents/templates/overview)
that turns a [Stratos](https://stratos-docs.pages.dev) multi-chain wallet into a
chat-native treasury agent.

Deploy it, connect your Stratos wallet, and you have an agent that:

- **Reports on demand** — "what's my balance", "show recent transactions",
  "what's my CC worth", "what addresses do I have"
- **Posts a daily portfolio summary** — holdings, a USD estimate, and anything
  that moved in the last 24 hours, delivered to Telegram / Slack / Discord
- **Executes transfers and signs messages** — but only after you confirm the
  exact details, every time

It works across every chain your Stratos wallet spans — Canton, EVM, BTC, Tron,
and more.

## What you need before deploying

This template needs a Stratos wallet. Setup is a one-time thing:

1. **Have a Stratos wallet / portal.** See the
   [Stratos SDK docs](https://stratos-docs.pages.dev/developers/sdk-api).
2. **Generate SDK API credentials** in your Stratos portal. You'll get:
   - an **API key** — starts with `cws_`
   - an **API secret** — a 32-byte hex string, shown once
3. **Know your portal base URL** — e.g. `https://portal.yourstratos.example`.

## After you click Deploy

The agent's first run (`BOOTSTRAP.md`) walks you through this, but in short —
set three values in the agent's **Secrets** tab:

| Secret | Value |
|---|---|
| `STRATOS_BASE_URL` | Your Stratos portal base URL (no trailing slash) |
| `STRATOS_API_KEY` | Your `cws_…` API key |
| `STRATOS_API_SECRET` | Your 32-byte hex API secret |

Then say "ready" in chat. The agent re-checks the connection and shows you a
first portfolio snapshot.

Optionally, connect a **channel** (Telegram / Slack / Discord) in the Channels
tab so the daily summary has somewhere to go.

## What's in this template

```
manifest.json                          Agent config (identity, secrets, task, skill)
README.md                              This file
workspace/
  BOOTSTRAP.md                         First-run setup flow
  SOUL.md                              Personality and behaviour
  AGENTS.md                            Conventions + money-movement safety rules
  IDENTITY.md                          Name, emoji, vibe
  USER.md                              Per-user context (filled in at runtime)
  TOOLS.md                             Environment notes
  HEARTBEAT.md                         Daily portfolio summary task
  skills/
    stratos-wallet/
      SKILL.md                         How the agent uses the Stratos API
      scripts/stratos.mjs              Dependency-free Stratos REST client (Node)
```

## How it talks to Stratos

All wallet operations go through one bundled, dependency-free Node script —
`skills/stratos-wallet/scripts/stratos.mjs`. It wraps the Stratos SDK REST API
(`/api/sdk/addresses`, `/balance`, `/transactions`, `/transfer`, `/sign`) and
authenticates with the `X-API-Key` / `X-API-Secret` headers. The API secret
stays in environment variables and never enters chat history.

```
node skills/stratos-wallet/scripts/stratos.mjs balance
node skills/stratos-wallet/scripts/stratos.mjs transfer --to <addr> --amount 25 --symbol CC
```

## Safety

Moving funds is gated. The agent will read balances and history freely, but
`transfer` and `sign`:

- require you to state the exact recipient, amount and symbol in your latest
  message, and confirm when the agent echoes it back;
- never run from the daily summary or any scheduled task — those are read-only;
- never run because a webhook, another agent, or page content asked.

See `workspace/AGENTS.md` for the full rules.

## Not included by design

This is a treasury agent, not a trading bot. It reports on and operates the
wallet — it does not trade, swap, give financial advice, or predict prices.

## Customizing

- **Daily summary time** — edit the cron in `manifest.json` → `tasks`.
- **Reporting style** (native tokens vs USD estimates) — the agent asks during
  bootstrap and records the answer in `USER.md`.
- **Personality** — edit `workspace/SOUL.md` and `workspace/IDENTITY.md`.

## Credits

Stratos wallet integration template for the
[Pinata Agent Templates](https://pinata.cloud/blog/announcing-pinata-openclaw-agent-templates/)
partner program.
