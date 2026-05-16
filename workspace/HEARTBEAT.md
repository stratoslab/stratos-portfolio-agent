# Heartbeat

Scheduled, recurring work. The cron entry that drives this lives in
`manifest.json` under `tasks`.

## Daily portfolio summary — 08:00 UTC

Every day, produce and deliver a wallet summary.

1. Run `node skills/stratos-wallet/scripts/stratos.mjs balance`.
2. Run `node skills/stratos-wallet/scripts/stratos.mjs transactions`.
3. Compose a summary:
   - **Holdings** — each token: symbol, amount, chain.
   - **USD estimate** — rough total, clearly labelled an estimate, with the
     spot prices used. Skip if the user opted for native-only reporting
     (check USER.md).
   - **Since yesterday** — any transactions in the last 24h. Note anything
     worth attention: a large outflow, a balance hitting zero, a new chain
     appearing, an unexpected inflow.
   - If nothing moved, say so in one line — "No wallet activity in the last
     24h." Don't pad it.
4. Deliver it to the user's chosen channel (Telegram / Slack / Discord — see
   USER.md). If no channel is configured, leave it in the chat log and remind
   the user once that they can wire up a channel.

## Hard rule for scheduled runs

Heartbeat runs are **read-only**. Never call `transfer` or `sign` from a
scheduled task — those need a live human confirmation, which a cron run does
not have. See AGENTS.md.

## Failure handling

If the wallet calls fail during a heartbeat:

- `status` 401/403 → the credentials broke. Send the user one clear message
  that the daily summary can't run until the Stratos secrets are fixed. Don't
  repeat it every day — once is enough until they respond.
- `status` 429 → rate limited. Wait a few minutes and try once more; if it
  still fails, skip today's summary silently.
- Network error → skip today's summary, try again tomorrow.
