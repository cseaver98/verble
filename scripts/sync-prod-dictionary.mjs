import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const repoRoot = resolve(import.meta.dirname, "..");
const localEnvPath = resolve(repoRoot, "apps/web/.env.local");
const productionEnvPath = process.env.VERBLE_PRODUCTION_ENV_PATH
  ? resolve(process.env.VERBLE_PRODUCTION_ENV_PATH)
  : resolve(repoRoot, "../dailydabble/apps/web/.env.production");

const parseEnvFile = (path) => {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
};

const createSupabase = (env, label) => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`Missing Supabase credentials for ${label}`);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

const fetchDictionary = async (client) => {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .schema("verble")
      .from("dictionary_words")
      .select("word,is_active")
      .order("word", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to read production dictionary: ${error.message}`);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};

const upsertDictionary = async (client, rows) => {
  const batchSize = 1000;
  for (let index = 0; index < rows.length; index += batchSize) {
    const { error } = await client
      .schema("verble")
      .from("dictionary_words")
      .upsert(rows.slice(index, index + batchSize), { onConflict: "word" });
    if (error) throw new Error(`Failed to update local dictionary: ${error.message}`);
  }
};

const production = createSupabase(parseEnvFile(productionEnvPath), "production");
const local = createSupabase(parseEnvFile(localEnvPath), "local");
const dictionary = await fetchDictionary(production);

if (dictionary.length === 0) throw new Error("Production dictionary is empty; local data was not changed.");

await upsertDictionary(local, dictionary);

const { count, error } = await local
  .schema("verble")
  .from("dictionary_words")
  .select("word", { count: "exact", head: true })
  .eq("is_active", true);

if (error) throw new Error(`Failed to verify local dictionary: ${error.message}`);

console.log(`Synced ${dictionary.length} production words. Local active dictionary: ${count ?? 0} words.`);
