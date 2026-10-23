const test=require('node:test'); const assert=require('node:assert/strict'); const {toCsv,providerConfigured,portfolioRiskSummary,applicantTriage,incomeDebtOutlook}=require('../fp32');
test('csv quoting preserves zero',()=>{ assert.ok(toCsv([{a:'x,y',n:0}]).includes('"x,y"')); assert.ok(toCsv([{n:0}]).includes('0')); });
test('provider gate',()=>{ assert.equal(providerConfigured({}),false); assert.equal(providerConfigured({OPENAI_API_KEY:'k'}),true); });
test('fallback preserves false zero empty',()=>{ const r=portfolioRiskSummary([]); assert.equal(r.aiGenerated,false); assert.equal(r.sections.find(s=>s.label.includes('reviewed')).value,0); const one=portfolioRiskSummary([{}]); assert.equal(one.aiGenerated,false); });
