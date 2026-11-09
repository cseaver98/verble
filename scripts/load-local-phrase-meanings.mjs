import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';

nextEnv.loadEnvConfig(fileURLToPath(new URL('../apps/web', import.meta.url)));
const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '54421') {
  throw new Error('This preview importer only accepts local Verble Supabase on port 54421.');
}
const client = createClient(url.href, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).schema('verble');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/phrase-meanings.json', import.meta.url), 'utf8'));
const { data: rows, error } = await client.from('phrases').select('id,phrase_text,meaning,source_note');
if (error) throw error;
const normalize = value => value.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const updates = fixture.phrases.map(draft => {
  const matches = rows.filter(row => normalize(row.phrase_text) === normalize(draft.phrase));
  if (matches.length !== 1) throw new Error(`Expected one local match: ${draft.phrase}`);
  return { draft, row: matches[0] };
});
const backup = new URL('../.env.phrase-meaning-backup.local', import.meta.url);
if (!existsSync(backup)) writeFileSync(backup, JSON.stringify(rows, null, 2));
for (const { draft, row } of updates) {
  const { error } = await client.from('phrases').update({ meaning: draft.meaning, source_note: draft.sourceNote }).eq('id', row.id);
  if (error) throw error;
}
console.log(`Loaded ${updates.length} editorial meaning drafts into local Supabase.`);
