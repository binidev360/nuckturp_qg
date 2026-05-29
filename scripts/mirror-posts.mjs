#!/usr/bin/env node
// ============================================================================
// mirror-posts.mjs — espelha o conteúdo PÚBLICO (posts) do Supabase do Lovable
// para o projeto novo. Só conteúdo publicado/legível por anon; SEM PII.
//   Origem (Lovable): lido via anon key do .env do projeto antigo (read-only).
//   Destino (novo):   inserido via secret key (.secrets/dev.env), bypassa RLS.
// FKs category_id / blog_author_id são anuladas (tabelas não mirradas).
// IMPORTANTE: rode com os triggers de USER de `posts` desabilitados (o orquestrador
// faz ALTER TABLE ... DISABLE TRIGGER USER antes/depois) para não disparar
// ping-search-engines / notificações 478x.
// ============================================================================
import { readFileSync } from "node:fs";

function parseEnv(path) {
  const map = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) map[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return map;
}

const NEW = parseEnv("D:/ProjetoAntigravity/Nuckturp_QG/.secrets/dev.env");
const OLD = parseEnv("D:/ProjetoAntigravity/Nuckturp_2.1/nuckturp/.env");

const SRC_URL = OLD.SUPABASE_URL || OLD.VITE_SUPABASE_URL;
const SRC_KEY = OLD.SUPABASE_PUBLISHABLE_KEY || OLD.VITE_SUPABASE_PUBLISHABLE_KEY;
const DST_URL = NEW.NEXT_PUBLIC_SUPABASE_URL;
const DST_KEY = NEW.SUPABASE_SECRET_KEY;

if (!SRC_URL || !SRC_KEY || !DST_URL || !DST_KEY) {
  console.error("Faltam credenciais (origem/destino).");
  process.exit(1);
}

async function fetchAll(table) {
  const res = await fetch(`${SRC_URL}/rest/v1/${table}?select=*&limit=2000`, {
    headers: { apikey: SRC_KEY, Authorization: `Bearer ${SRC_KEY}` },
  });
  if (!res.ok) throw new Error(`fetch ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function upsert(table, rows) {
  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = await fetch(`${DST_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: DST_KEY,
        Authorization: `Bearer ${DST_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`upsert ${table} [${i}]: ${res.status} ${await res.text()}`);
    done += chunk.length;
    console.log(`  ${table}: ${done}/${rows.length}`);
  }
  return done;
}

const posts = await fetchAll("posts");
console.log(`Lovable posts (anon): ${posts.length}`);
for (const p of posts) {
  p.category_id = null; // FK -> post_categories (não mirrado)
  p.blog_author_id = null; // FK -> blog_authors (não mirrado)
}
const n = await upsert("posts", posts);
console.log(`OK: ${n} posts espelhados no projeto novo.`);
