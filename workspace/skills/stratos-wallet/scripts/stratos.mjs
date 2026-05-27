#!/usr/bin/env node
/**
 * Stratos wallet CLI — a dependency-free wrapper around the Stratos SDK REST API.
 *
 * The agent calls this instead of hand-crafting signed HTTP requests, so secrets
 * never land in chat history and request shape stays correct.
 *
 * Auth comes from environment variables (set them as Pinata Secrets):
 *   STRATOS_BASE_URL    e.g. https://portal.yourstratos.example
 *   STRATOS_API_KEY     starts with cws_
 *   STRATOS_API_SECRET  hex, 32 bytes
 *
 * Usage:
 *   node stratos.mjs addresses
 *   node stratos.mjs balance
 *   node stratos.mjs transactions
 *   node stratos.mjs transfer --to <addr> --amount <n> --symbol <SYM> [--chain <chain>]
 *   node stratos.mjs sign --chain-type <evm|btc|tron|canton> --message "<text>"
 *
 * Output: always a single JSON object on stdout.
 *   success → { ok: true, command, result }
 *   failure → { ok: false, command, error, status? }   (exit code 1)
 *
 * API reference: https://stratos-docs.pages.dev/developers/sdk-api
 */

const BASE_URL = (process.env.STRATOS_BASE_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.STRATOS_API_KEY || "";
const API_SECRET = process.env.STRATOS_API_SECRET || "";

// Stratos caps at 30 requests/minute. This script is process-per-call so it
// can't enforce a window itself — the agent should avoid hammering it. The
// daily heartbeat and on-demand use stay well under the cap.

function out(obj, code = 0) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
  process.exit(code);
}

function fail(command, error, status) {
  out({ ok: false, command, error: String(error), ...(status ? { status } : {}) }, 1);
}

function requireConfig(command) {
  const missing = [];
  if (!BASE_URL) missing.push("STRATOS_BASE_URL");
  if (!API_KEY) missing.push("STRATOS_API_KEY");
  if (!API_SECRET) missing.push("STRATOS_API_SECRET");
  if (missing.length) {
    fail(
      command,
      `Stratos wallet is not configured. Set these Pinata Secrets: ${missing.join(", ")}.`
    );
  }
}

async function api(command, method, path, body) {
  const headers = { "X-API-Key": API_KEY, "X-API-Secret": API_SECRET };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    fail(command, `Network error reaching Stratos: ${e.message}`);
    return;
  }

  const text = await res.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }

  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String(parsed.error)
        : `Stratos ${method} ${path} failed (HTTP ${res.status})`;
    fail(command, msg, res.status);
    return;
  }
  return parsed;
}

/**
 * Stratos wraps list responses inconsistently — sometimes a bare array,
 * sometimes {balances:[...]}, sometimes a chain-keyed map. Flatten defensively
 * so the agent always sees a clean array, and also return `raw` so a parser
 * miss is still recoverable.
 */
function pickArray(body, preferredKeys = []) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  for (const k of preferredKeys) {
    const v = body[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const flat = flattenMap(v);
      if (flat.length) return flat;
    }
  }
  for (const v of Object.values(body)) {
    if (Array.isArray(v)) return v;
  }
  const top = flattenMap(body);
  if (top.length) return top;
  if ("amount" in body || "balance" in body || "address" in body || "partyId" in body) {
    return [body];
  }
  return [];
}

function flattenMap(m) {
  const entries = Object.entries(m).filter(([k]) => !k.startsWith("_") && k !== "success");
  if (!entries.length) return [];
  if (entries.every(([, v]) => typeof v === "number" || typeof v === "string")) {
    return entries.map(([symbol, amount]) => ({ symbol, amount }));
  }
  if (entries.every(([, v]) => v && typeof v === "object" && !Array.isArray(v))) {
    const looksLikeEntry = entries.every(([, v]) => {
      const r = v;
      return (
        "amount" in r || "balance" in r || "address" in r ||
        "partyId" in r || "symbol" in r || "token" in r
      );
    });
    if (looksLikeEntry) return entries.map(([chain, v]) => ({ chain, ...v }));
  }
  return [];
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      flags[key] = val;
    }
  }
  return flags;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  if (!command) {
    fail("(none)", "No command. Use: addresses | balance | transactions | transfer | sign");
    return;
  }

  requireConfig(command);

  switch (command) {
    case "addresses": {
      const raw = await api(command, "GET", "/api/sdk/addresses");
      out({ ok: true, command, result: { items: pickArray(raw, ["addresses", "data", "results"]), raw } });
      break;
    }
    case "balance": {
      const raw = await api(command, "GET", "/api/sdk/balance");
      out({ ok: true, command, result: { items: pickArray(raw, ["balances", "data", "results"]), raw } });
      break;
    }
    case "transactions": {
      const raw = await api(command, "GET", "/api/sdk/transactions");
      out({ ok: true, command, result: { items: pickArray(raw, ["transactions", "data", "results"]), raw } });
      break;
    }
    case "transfer": {
      if (!flags.to || !flags.amount || !flags.symbol) {
        fail(command, "transfer requires --to, --amount and --symbol");
        return;
      }
      const body = { to: flags.to, amount: flags.amount, symbol: flags.symbol };
      if (flags.chain) body.chain = flags.chain;
      const raw = await api(command, "POST", "/api/sdk/transfer", body);
      out({ ok: true, command, result: raw });
      break;
    }
    case "sign": {
      const chainType = flags["chain-type"] || flags.chainType;
      if (!chainType || !flags.message) {
        fail(command, "sign requires --chain-type and --message");
        return;
      }
      const raw = await api(command, "POST", "/api/sdk/sign", {
        chainType,
        message: flags.message,
      });
      out({ ok: true, command, result: raw });
      break;
    }
    default:
      fail(command, `Unknown command "${command}". Use: addresses | balance | transactions | transfer | sign`);
  }
}

main();
