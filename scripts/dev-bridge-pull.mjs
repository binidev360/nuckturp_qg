// @ts-nocheck
/**
 * dev-bridge-pull.mjs
 *
 * Cliente de migração read-only contra o "Dev Bridge" do QG antigo (Lovable Cloud).
 * Puxa schema, tabelas (cursor pagination), usuários (auth) e listagem de storage
 * para arquivos locais em export/ (gitignored). NÃO escreve no banco novo: a
 * re-hidratação (preservando UUIDs + ordem de FK) é uma fase separada (cutover),
 * que depende também do dump de auth com encrypted_password.
 *
 * Uso:
 *   node scripts/dev-bridge-pull.mjs ping
 *   node scripts/dev-bridge-pull.mjs schema
 *   node scripts/dev-bridge-pull.mjs pull [tabela ...]   # default: allowlist toda
 *   node scripts/dev-bridge-pull.mjs auth
 *   node scripts/dev-bridge-pull.mjs storage [bucket ...] [--download]
 *
 * Credenciais: .secrets/dev.env (DEV_BRIDGE_BASE_URL, DEV_BRIDGE_ANON, DEV_BRIDGE_TOKEN).
 */

import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXPORT_DIR = join(ROOT, "export");
const DB_DIR = join(EXPORT_DIR, "db");
const STORAGE_DIR = join(EXPORT_DIR, "storage");

// ── Tabelas liberadas na allowlist da função dev-bridge ──
const ALLOWLIST = [
  "profiles",
  "user_roles",
  "tenants",
  "blog_authors",
  "blog_categories",
  "posts",
  "post_categories",
  "post_reactions",
  "author_follows",
  "campaigns",
  "campaign_shares",
  "sessions",
  "session_feedback_configs",
  "session_feedback_responses",
  "feedback_view_events",
  "players",
  "player_campaigns",
  "character_relationships",
  "consent_links",
  "notes",
  "note_shares",
  "notifications",
  "user_notifications",
  "featured_links",
  "tags",
  "academy_courses",
  "academy_course_modules",
  "academy_lessons",
  "academy_settings",
  "academy_cards",
  "academy_annotations",
  "premium_overrides",
];

const STORAGE_BUCKETS = ["profile-assets", "blog-assets"];

// ── Carrega .secrets/dev.env (parser simples, sem dependência externa) ──
function loadEnv() {
  const envPath = join(ROOT, ".secrets", "dev.env");
  if (!existsSync(envPath)) {
    throw new Error(`.secrets/dev.env não encontrado em ${envPath}`);
  }
  const out = {};
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const ENV = loadEnv();
const BASE = ENV.DEV_BRIDGE_BASE_URL;
const ANON = ENV.DEV_BRIDGE_ANON;
const TOKEN = ENV.DEV_BRIDGE_TOKEN;

if (!BASE || !ANON || !TOKEN) {
  console.error("Faltam DEV_BRIDGE_BASE_URL / DEV_BRIDGE_ANON / DEV_BRIDGE_TOKEN em .secrets/dev.env");
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  apikey: ANON,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chamada GET à ponte com retry exponencial leve. */
async function bridge(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} em ${path}: ${text.slice(0, 400)}`);
        await sleep(500 * (attempt + 1));
        continue;
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Resposta não-JSON (${res.status}) em ${path}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} em ${path}: ${JSON.stringify(json).slice(0, 300)}`);
      }
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt === 3) break;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

function ensureDirs() {
  for (const d of [EXPORT_DIR, DB_DIR, STORAGE_DIR]) mkdirSync(d, { recursive: true });
}

// ── Comandos ──────────────────────────────────────────────────────────────

async function cmdPing() {
  const r = await bridge("/ping");
  console.log("PING:", JSON.stringify(r));
}

async function cmdSchema() {
  ensureDirs();
  const r = await bridge("/schema");
  writeFileSync(join(EXPORT_DIR, "schema.json"), JSON.stringify(r, null, 2));
  // O formato exato do payload pode variar; tenta normalizar para { tabela: [colunas] }.
  const byTable = normalizeSchema(r);
  console.log(`SCHEMA: ${Object.keys(byTable).length} tabelas\n`);
  for (const t of ALLOWLIST) {
    const cols = byTable[t];
    if (!cols) {
      console.log(`  ${t.padEnd(28)} (ausente no schema retornado)`);
      continue;
    }
    const order = pickOrderColumn(cols);
    console.log(`  ${t.padEnd(28)} ${cols.length} cols · order=${order}`);
  }
  console.log("\n→ schema completo salvo em export/schema.json");
  return byTable;
}

/** Tenta extrair { tabela: [{name,type}|"name", ...] } de diferentes formatos. */
function normalizeSchema(r) {
  const out = {};
  // Formato A: array de linhas de information_schema.columns
  const rows = Array.isArray(r) ? r : r.columns || r.rows || r.data;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const t = row.table_name || row.table || row.tablename;
      const c = row.column_name || row.column || row.name;
      if (!t) continue;
      (out[t] ||= []).push(c ? { name: c, type: row.data_type || row.type } : row);
    }
    if (Object.keys(out).length) return out;
  }
  // Formato B: objeto { tabela: [...] }
  if (r && typeof r === "object") {
    for (const [k, v] of Object.entries(r)) {
      if (Array.isArray(v)) out[k] = v;
    }
  }
  return out;
}

function colName(c) {
  return typeof c === "string" ? c : c.name || c.column_name || c.column;
}

function pickOrderColumn(cols) {
  const names = cols.map(colName);
  if (names.includes("id")) return "id";
  if (names.includes("created_at")) return "created_at";
  return names[0] || "id";
}

/** Puxa uma tabela inteira com um order fixo. Lança em erro de página. */
async function pullTableWithOrder(t, order, file) {
  writeFileSync(file, ""); // zera
  let cursor = undefined;
  let total = 0;
  let pages = 0;
  do {
    const page = await bridge(`/table/${t}`, { limit: 1000, order, after: cursor });
    const rows = page.rows || [];
    if (rows.length) appendFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    total += rows.length;
    cursor = page.next_cursor;
    pages++;
    if (pages > 5000) {
      console.warn(`  ! ${t}: cap de 5000 páginas atingido, interrompendo`);
      break;
    }
  } while (cursor !== null && cursor !== undefined);
  return total;
}

async function cmdPull(tables) {
  ensureDirs();
  // /schema está quebrado no servidor (500); não dependemos dele. Tentamos
  // order=id e caímos para created_at em tabelas que não tenham id.
  const list = tables.length ? tables : ALLOWLIST;
  const counts = {};
  for (const t of list) {
    const file = join(DB_DIR, `${t}.jsonl`);
    let done = false;
    let lastErr;
    for (const order of ["id", "created_at", "slug", "name", "updated_at", "key"]) {
      try {
        const total = await pullTableWithOrder(t, order, file);
        counts[t] = total;
        console.log(`  ${t.padEnd(28)} ${String(total).padStart(6)} linhas  (order=${order})`);
        done = true;
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!done) {
      counts[t] = `ERRO: ${lastErr?.message ?? "falhou em todos os order"}`;
      console.log(`  ${t.padEnd(28)} ERRO: ${lastErr?.message ?? "todos os order falharam"}`);
    }
  }
  writeFileSync(join(EXPORT_DIR, "_counts.json"), JSON.stringify(counts, null, 2));
  console.log("\n→ dumps em export/db/*.jsonl · contagens em export/_counts.json");
}

async function cmdAuth() {
  ensureDirs();
  const all = [];
  let page = 1;
  for (;;) {
    const r = await bridge("/auth/users", { page, per_page: 200 });
    const users = r.users || r.rows || (Array.isArray(r) ? r : []);
    all.push(...users);
    const next = r.next_page ?? r.nextPage;
    if (!users.length || next === null || next === undefined) {
      if (next === undefined && users.length === 200) {
        page++;
        continue;
      }
      break;
    }
    page = next;
  }
  writeFileSync(join(EXPORT_DIR, "auth-users.json"), JSON.stringify(all, null, 2));
  const confirmed = all.filter((u) => u.email_confirmed_at).length;
  console.log(`AUTH: ${all.length} usuários (${confirmed} com e-mail confirmado)`);
  console.log("→ export/auth-users.json (sem hash de senha; ver seção 4 do manual)");
}

/** Lista um nível do bucket (resposta { bucket, prefix, items }). */
async function listStorage(bucket, prefix) {
  const r = await bridge(`/storage/${bucket}`, { prefix, limit: 1000 });
  return r.items || r.objects || r.rows || r.files || (Array.isArray(r) ? r : []);
}

/** Varre o bucket recursivamente. Item com id===null é pasta; senão é arquivo. */
async function walkStorage(bucket, prefix, files, depth = 0) {
  if (depth > 8) return;
  const items = await listStorage(bucket, prefix);
  for (const it of items) {
    const name = it.name;
    if (!name || name === ".emptyFolderPlaceholder") continue;
    const full = prefix ? `${prefix}${name}` : name;
    const isFolder = it.id === null || it.id === undefined;
    if (isFolder) {
      await walkStorage(bucket, `${full}/`, files, depth + 1);
    } else {
      files.push({ path: full, size: it.metadata?.size, mimetype: it.metadata?.mimetype });
    }
  }
}

async function cmdStorage(args) {
  ensureDirs();
  const download = args.includes("--download");
  const buckets = args.filter((a) => !a.startsWith("--"));
  const list = buckets.length ? buckets : STORAGE_BUCKETS;
  for (const bucket of list) {
    const files = [];
    await walkStorage(bucket, "", files);
    writeFileSync(join(STORAGE_DIR, `${bucket}.json`), JSON.stringify(files, null, 2));
    // Resumo por pasta de topo.
    const byTop = {};
    for (const f of files) {
      const top = f.path.includes("/") ? f.path.slice(0, f.path.indexOf("/")) : "(raiz)";
      byTop[top] = (byTop[top] || 0) + 1;
    }
    const breakdown = Object.entries(byTop)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    console.log(`STORAGE ${bucket}: ${files.length} arquivos  [${breakdown}]`);
    if (download) {
      const dir = join(STORAGE_DIR, bucket);
      mkdirSync(dir, { recursive: true });
      let ok = 0;
      for (const f of files) {
        try {
          const meta = await bridge(`/storage/${bucket}/object`, { path: f.path });
          if (!meta.signed_url) continue;
          const bin = await fetch(meta.signed_url);
          const buf = Buffer.from(await bin.arrayBuffer());
          const safe = f.path.replace(/[\\/]/g, "__");
          writeFileSync(join(dir, safe), buf);
          ok++;
        } catch {
          /* segue */
        }
      }
      console.log(`  ↳ ${ok}/${files.length} baixados em export/storage/${bucket}/`);
    }
  }
}

/** Diagnóstico: imprime o JSON cru de um path arbitrário. Aceita params k=v. */
async function cmdRaw(args) {
  const path = args[0];
  const params = {};
  for (const a of args.slice(1)) {
    const i = a.indexOf("=");
    if (i > 0) params[a.slice(0, i)] = a.slice(i + 1);
  }
  const r = await bridge(path, params);
  console.log(JSON.stringify(r, null, 2).slice(0, 3000));
}

// ── Dispatch ────────────────────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);

const run = {
  ping: () => cmdPing(),
  schema: () => cmdSchema(),
  pull: () => cmdPull(rest),
  auth: () => cmdAuth(),
  storage: () => cmdStorage(rest),
  raw: () => cmdRaw(rest),
};

if (!cmd || !run[cmd]) {
  console.log("Comandos: ping | schema | pull [tabela...] | auth | storage [bucket...] [--download]");
  process.exit(cmd ? 1 : 0);
}

run[cmd]().catch((err) => {
  console.error("FALHOU:", err.message);
  process.exit(1);
});
