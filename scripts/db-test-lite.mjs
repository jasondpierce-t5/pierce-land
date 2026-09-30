#!/usr/bin/env node
/**
 * Fallback for `supabase test db` on machines without Docker (cloud sessions, a fresh laptop).
 *
 * Boots an in-process Postgres (PGlite, WASM), stubs the pieces of Supabase the migrations rely
 * on (auth schema, auth.uid(), the anon/authenticated/service_role roles, default grants),
 * applies supabase/migrations + the seed files from config.toml, then runs every
 * supabase/tests/**\/*.sql pgTAP file and reports TAP results.
 *
 * It is NOT a substitute for the real stack: `npm run check` runs `supabase test db`.
 * PGlite runs a newer Postgres than Supabase and has no GoTrue, Realtime, or PostgREST.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pgtap } from "@electric-sql/pglite-pgtap";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supa = path.join(root, "supabase");
const filter = process.argv[2]; // optional substring to run a subset of test files

const SUPABASE_SHIM = /* sql */ `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid,
  aud varchar(255),
  role varchar(255),
  email varchar(255) unique,
  phone text unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  confirmation_token varchar(255) default '',
  recovery_token varchar(255) default '',
  email_change_token_new varchar(255) default '',
  email_change varchar(255) default '',
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text,
  unique (provider_id, provider)
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
set search_path = "$user", public, extensions;
`;

function listSql(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSql(p));
    else if (entry.name.endsWith(".sql")) out.push(p);
  }
  return out.sort();
}

/** Expand psql `\ir file` includes (pg_prove runs tests through psql, so they work there too). */
function load(file, seen = new Set()) {
  if (seen.has(file)) throw new Error(`include cycle at ${file}`);
  seen.add(file);
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => {
      const m = /^\s*\\ir\s+(\S+)\s*$/.exec(line);
      return m ? load(path.resolve(path.dirname(file), m[1]), new Set(seen)) : line;
    })
    .join("\n");
}

function seedPaths() {
  const toml = fs.readFileSync(path.join(supa, "config.toml"), "utf8");
  const section = /\[db\.seed\]([\s\S]*?)(\n\[|$)/.exec(toml)?.[1] ?? "";
  if (/^\s*enabled\s*=\s*false/m.test(section)) return [];
  const list = /^\s*sql_paths\s*=\s*\[([^\]]*)\]/m.exec(section)?.[1] ?? '"./seed.sql"';
  return [...list.matchAll(/"([^"]+)"/g)].map((m) => path.resolve(supa, m[1])).filter((p) => fs.existsSync(p));
}

const rel = (p) => path.relative(root, p).replaceAll("\\", "/");

async function main() {
  const db = await PGlite.create({ extensions: { pgtap, pgcrypto } });
  await db.exec(SUPABASE_SHIM);

  for (const file of [...listSql(path.join(supa, "migrations")), ...seedPaths()]) {
    try {
      await db.exec(load(file));
    } catch (e) {
      console.error(`✗ ${rel(file)}: ${e.message}`);
      if (e.position) console.error(`  at character ${e.position}`);
      await db.close();
      return 1;
    }
  }
  await db.exec("create extension if not exists pgtap with schema extensions;");

  const tests = listSql(path.join(supa, "tests")).filter((f) => !filter || f.includes(filter));
  let failedFiles = 0;
  let total = 0;
  for (const file of tests) {
    const lines = [];
    let error = null;
    try {
      const results = await db.exec(load(file));
      for (const r of results) for (const row of r.rows) {
        const v = Object.values(row)[0];
        if (typeof v === "string") lines.push(...v.split("\n"));
      }
    } catch (e) {
      error = e;
      await db.exec("rollback").catch(() => {});
    }
    await db.exec("reset role; select set_config('request.jwt.claims', '', false);").catch(() => {});

    const planned = Number(/^1\.\.(\d+)/m.exec(lines.join("\n"))?.[1] ?? NaN);
    const results = lines.filter((l) => /^(not )?ok \d+/.test(l));
    const failures = results.filter((l) => l.startsWith("not ok"));
    const ok = !error && failures.length === 0 && results.length === planned;
    total += results.length;
    if (!ok) failedFiles++;
    console.log(`${ok ? "✓" : "✗"} ${rel(file)} (${results.length - failures.length}/${Number.isNaN(planned) ? "?" : planned})`);
    if (!ok) {
      for (const l of lines) if (l.startsWith("not ok") || l.startsWith("#")) console.log(`    ${l}`);
      if (error) console.log(`    ERROR: ${error.message}${error.position ? ` (at character ${error.position})` : ""}`);
      if (!error && results.length !== planned) console.log(`    planned ${planned}, ran ${results.length}`);
    }
  }
  console.log(`\n${tests.length - failedFiles}/${tests.length} files passed, ${total} assertions (PGlite fallback)`);
  await db.close();
  return failedFiles ? 1 : 0;
}

process.exitCode = await main();
