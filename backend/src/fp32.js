'use strict';
function csvCell(v){ if(v===null||v===undefined) return ''; const s=typeof v==='object'?JSON.stringify(v):String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCsv(rows, cols){ const c=cols||(rows[0]?Object.keys(rows[0]):[]); return [c.join(','), ...rows.map(r=>c.map(k=>csvCell(r[k])).join(','))].join('\n'); }
function providerConfigured(env){ env=env||process.env; const r=env.OPENROUTER_API_KEY, o=env.OPENAI_API_KEY; return Boolean((r&&r!=='your_openrouter_key_here'&&r!=='your-openrouter-key-here')||(o&&o!=='your_openai_key_here')); }

function portfolioRiskSummary(rows){ rows=rows||[]; const byStatus={}; let low=0; rows.forEach(r=>{ byStatus[r.status||'unknown']=(byStatus[r.status||'unknown']||0)+1; const s=Number(r.creditScore); if(!isNaN(s)&&s<580) low++; }); const scores=rows.map(r=>Number(r.creditScore)).filter(n=>!isNaN(n)); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:0;
 return {feature:'portfolio-risk-summary',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Applicants reviewed',value:rows.length},{label:'By status',value:byStatus},{label:'Average credit score',value:avg},{label:'Below 580 count',value:low},{label:'Has applicants',value:rows.length>0},{label:'Notes',value:''}]}; }
function applicantTriage(rows){ rows=rows||[]; const pending=rows.filter(r=>String(r.status||'pending').toLowerCase()==='pending');
 return {feature:'applicant-triage',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Applicants reviewed',value:rows.length},{label:'Pending count',value:pending.length},{label:'Pending detail',value:pending.slice(0,50).map(r=>({name:((r.firstName||'')+' '+(r.lastName||'')).trim(),creditScore:r.creditScore??0,annualIncome:r.annualIncome??0}))},{label:'Pending share',value:rows.length?Math.round(pending.length/rows.length*1000)/10:0}]}; }
function incomeDebtOutlook(rows){ rows=rows||[]; let high=0; rows.forEach(r=>{ const inc=Number(r.annualIncome)||0; const debt=Number(r.existingDebt)||0; if(inc>0&&debt/inc>0.5) high++; });
 return {feature:'income-debt-outlook',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Applicants reviewed',value:rows.length},{label:'High debt-to-income count',value:high},{label:'High DTI share',value:rows.length?Math.round(high/rows.length*1000)/10:0},{label:'Has applicants',value:rows.length>0}]}; }

module.exports={toCsv,providerConfigured,portfolioRiskSummary,applicantTriage,incomeDebtOutlook};
