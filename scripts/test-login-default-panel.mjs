import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/return ACTIVE_PANEL_IDS\.has\(value\)\?value:'sales'/,'a new session must default to Sales');
assert.match(html,/normalizeActivePanelId\(localStorage\.getItem\(ACTIVE_PANEL_STORAGE_KEY\)\)/,'reload must restore the last active valid panel');
assert.match(html,/localStorage\.setItem\(ACTIVE_PANEL_STORAGE_KEY,'sales'\)[\s\S]{0,80}location\.reload\(\)/,'successful login must open Sales');
assert.match(html,/localStorage\.setItem\(ACTIVE_PANEL_STORAGE_KEY,activePanelId\)/,'normal navigation must keep persisting the active panel');
assert.match(html,/fetch\('\/api\/auth\/login'/,'login must use the Vibe auth API');
assert.match(html,/fetch\('\/api\/auth\/session'/,'session restore must use the Vibe auth API');
assert.match(html,/fetch\('\/api\/auth\/logout'/,'logout must use the Vibe auth API');
const earlyAuth=html.slice(html.indexOf('<script id="lyEarlyAuthShim">'),html.indexOf('</script>',html.indexOf('<script id="lyEarlyAuthShim">')));
const loginAuth=html.slice(html.indexOf('async function v260Login()'),html.indexOf('async function v263ResetOrganizationData()'));
assert.match(earlyAuth,/provider:'vibe'/,'early auth must be owned by Vibe');
assert.doesNotMatch(earlyAuth+loginAuth,/sb\.auth\.|signInWithPassword|getSession\(\)|signOut\(\)/,'login flow must not fall back to restricted Supabase Auth');
console.log('Login default Sales with reload persistence: PASS');
