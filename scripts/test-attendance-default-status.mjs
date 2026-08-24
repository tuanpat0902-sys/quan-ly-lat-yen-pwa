import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');

assert.match(html,/status:saved\?\(saved\.status\|\|'work'\):'off'/,'new attendance rows must default to off while preserving legacy saved rows');
assert.match(html,/full_day:saved\?\(saved\.full_day==null\?1:Number\(saved\.full_day\)\):0/,'new off rows must default to zero workday');
assert.match(html,/<option value="off" \$\{r\.status==='off'\?'selected':''\}>Không đi làm<\/option>/,'attendance status selector must include Không đi làm');
assert.match(html,/row\.classList\.toggle\('is-nonworking-day',status!=='work'\)/,'off rows must use non-working visual state');
assert.match(html,/const total=status==='work'\?Math\.max\(0,regular\+otPay\+bonus-penalty\):0/,'off rows must preview zero daily pay');
assert.match(html,/if\(r\.status!=='work'\)continue/,'payroll must exclude non-working default rows');
console.log('Attendance default Không đi làm: PASS');
