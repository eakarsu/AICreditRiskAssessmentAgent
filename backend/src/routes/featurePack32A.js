'use strict';
const express=require('express');
const { Op }=require('sequelize');
const {toCsv,providerConfigured,portfolioRiskSummary,applicantTriage,incomeDebtOutlook}=require('../fp32');
const FN={'portfolio-risk-summary':portfolioRiskSummary,'applicant-triage':applicantTriage,'income-debt-outlook':incomeDebtOutlook};
module.exports=function({sequelize,Applicant,auth}){
 const router=express.Router(); router.use(auth);
 let ready=null; function ensure(){ if(!ready) ready=sequelize.query("CREATE TABLE IF NOT EXISTS fp32_tasks (id SERIAL PRIMARY KEY, user_id TEXT, title TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal', due_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())").catch(e=>{ready=null;throw e;}); return ready; }
 async function q(sql, replacements){ const [rows]=await sequelize.query(sql,{replacements}); return rows; }
 router.get('/tasks',async(req,res)=>{ try{ await ensure(); let rows=await q('SELECT * FROM fp32_tasks ORDER BY id DESC LIMIT 200'); if(req.query.status) rows=rows.filter(r=>r.status===req.query.status); if(req.query.search){ const s=String(req.query.search).toLowerCase(); rows=rows.filter(r=>String(r.title||'').toLowerCase().includes(s)||String(r.description||'').toLowerCase().includes(s)); } res.json({data:rows,total:rows.length}); }catch(e){res.status(500).json({error:e.message});} });
 router.post('/tasks',async(req,res)=>{ try{ const title=String((req.body||{}).title||'').trim(); if(!title) return res.status(400).json({error:'title is required'}); await ensure(); const b=req.body; const uid=String((req.user&&(req.user.id||req.user.userId))||''); const rows=await q('INSERT INTO fp32_tasks (user_id,title,description,status,priority,due_date) VALUES (:uid,:title,:desc,:status,:priority,:due) RETURNING *',{uid,title,desc:String(b.description||''),status:String(b.status||'open'),priority:String(b.priority||'normal'),due:b.due_date||null}); res.status(201).json(rows[0]); }catch(e){res.status(500).json({error:e.message});} });
 async function upd(req,res){ try{ await ensure(); const b=req.body||{}; const rows=await q('UPDATE fp32_tasks SET title=COALESCE(:title,title),description=COALESCE(:desc,description),status=COALESCE(:status,status),priority=COALESCE(:priority,priority),due_date=COALESCE(:due,due_date),updated_at=NOW() WHERE id=:id RETURNING *',{title:b.title??null,desc:b.description??null,status:b.status??null,priority:b.priority??null,due:b.due_date??null,id:req.params.id}); if(!rows.length) return res.status(404).json({error:'Task not found'}); res.json(rows[0]); }catch(e){res.status(500).json({error:e.message});} }
 router.put('/tasks/:id',upd); router.patch('/tasks/:id',upd);
 function whereFor(req){ const w={}; if(req.query.status) w.status=req.query.status; if(req.query.employmentStatus) w.employmentStatus=req.query.employmentStatus; if(req.query.search){ const s='%'+req.query.search+'%'; w[Op.or]=[{firstName:{[Op.iLike]:s}},{lastName:{[Op.iLike]:s}},{email:{[Op.iLike]:s}},{employerName:{[Op.iLike]:s}}]; } return w; }
 async function fetchApplicants(req){ return Applicant.findAll({where:whereFor(req),order:[['createdAt','DESC']],limit:200}); }
 router.get('/applicants/export',async(req,res)=>{ try{ const rows=await fetchApplicants(req); const plain=rows.map(r=>r.toJSON()); if(String(req.query.format||'json').toLowerCase()==='csv'){ res.setHeader('Content-Type','text/csv'); return res.send(toCsv(plain)); } return res.json({data:plain,total:plain.length}); }catch(e){res.status(500).json({error:e.message});} });
 router.get('/applicants',async(req,res)=>{ try{ const rows=await fetchApplicants(req); const plain=rows.map(r=>r.toJSON()); res.json({data:plain,total:plain.length}); }catch(e){res.status(500).json({error:e.message});} });
 
 async function handleAi(req,res,fetchRecords){
   const fn=FN[req.params.feature]; if(!fn) return res.status(404).json({error:'unknown feature',features:Object.keys(FN)});
   let records=Array.isArray(req.body&&req.body.records)?req.body.records:null;
   if(!records){ try{ records=await fetchRecords(req); }catch(e){ return res.status(500).json({error:e.message}); } }
   const plain=records.map(r=>(r&&typeof r.toJSON==='function')?r.toJSON():(r&&r.dataValues?r.dataValues:r));
   const fb=fn(plain);
   if(!providerConfigured()) return res.json(fb);
   try{
     const key=process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY;
     const base=process.env.OPENROUTER_API_KEY?'https://openrouter.ai/api/v1':'https://api.openai.com/v1';
     const r=await fetch(base+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||'anthropic/claude-haiku-4.5',messages:[{role:'system',content:'Summarize supplied records only. Return JSON with sections array of {label,value}.'},{role:'user',content:JSON.stringify(fb.sections)}],temperature:0.2})});
     if(!r.ok) throw new Error('provider failed');
     const j=await r.json(); const txt=(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
     let sections; try{ sections=JSON.parse(txt).sections; }catch(_){ sections=[{label:'Summary',value:txt}]; }
     return res.json({feature:fb.feature,aiGenerated:true,source:'provider',sections});
   }catch(_){ return res.json(Object.assign({},fb,{providerError:'provider call failed; deterministic fallback shown'})); }
 }

 router.post('/ai/:feature',async(req,res)=>{ try{ await handleAi(req,res,fetchApplicants); }catch(e){res.status(500).json({error:e.message});} });
 return router;
};
