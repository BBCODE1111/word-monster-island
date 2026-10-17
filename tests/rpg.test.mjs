import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {RARITIES,UNLOCKS,encounterOdds,chooseSpecies,newProfile,monsterStats,makeMonster,migrateLegacy,rosterSummary,reduceGame,canCatch} from '../dist/rpg.mjs';
const catalog=JSON.parse(readFileSync(new URL('../dist/data/monsters.json',import.meta.url))),data=JSON.parse(readFileSync(new URL('../dist/data/vocabulary.json',import.meta.url)));
const settings={mode:'choice',course:'ALL',scope:'all',groupIds:[],timed:false,seconds:25};
let seed=71;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
const run=(s,a,opts={})=>reduceGame(s,a,data,catalog,{random,...opts});
function ready(){return run(run({profile:null,mission:null},{type:'starter',speciesId:'leaf'}),{type:'start',settings});}
function answer(s,intent='attack',correct=true,opts={}){const q=s.mission.question,card=data.cards.find(c=>c.id===q.cardId);return run(s,{type:'answer',questionId:q.id,intent,answer:correct?card.english:'wrong'},opts);}
test('100 distinct illustrated species have full stats, abilities and valid sprite cells',()=>{
 assert.equal(catalog.length,100);assert.equal(new Set(catalog.map(s=>s.id)).size,100);assert.equal(new Set(catalog.map(s=>s.name)).size,100);
 assert.deepEqual(RARITIES.map(r=>catalog.filter(s=>s.rarity===r).length),[32,30,22,12,4]);
 const cells=new Set();for(const s of catalog){assert.ok(s.ability.name&&s.ability.description&&s.specialMove);assert.ok(Object.values(s.baseStats).every(n=>n>0));assert.ok(s.sprite.index>=0&&s.sprite.index<s.sprite.columns*s.sprite.rows);assert.ok(existsSync(new URL('../dist/'+s.sprite.file,import.meta.url)));cells.add(s.sprite.file+':'+s.sprite.index);}assert.equal(cells.size,100);
});
test('rarity gates cannot be bypassed by spelling; boost stays small and leaves catches unchanged',()=>{
 for(let n=0;n<100;n++){for(const mode of ['choice','spell','mixed']){const odds=encounterOdds(n,mode);assert.ok(Math.abs(Object.values(odds).reduce((a,b)=>a+b)-1)<1e-12);for(const r of RARITIES)if(n<UNLOCKS[r])assert.equal(odds[r],0);}}
 const choice=encounterOdds(80,'choice'),spell=encounterOdds(80,'spell');assert.ok(spell.Rare>choice.Rare&&spell.Rare-choice.Rare<.01);assert.ok(spell.Legendary<.002);for(let i=0;i<1000;i++)assert.equal(chooseSpecies(catalog,0,'spell',random).rarity,'Common');
});
test('each teammate has individual qualities that change actual battle stats',()=>{
 const s=catalog[0],low=makeMonster(s,{random:()=>0}),high=makeMonster(s,{random:()=>.999});assert.ok(monsterStats(high,catalog).hp>monsterStats(low,catalog).hp);const p=newProfile('leaf',catalog,{random});assert.equal(rosterSummary(p,catalog).caught,0);assert.equal(rosterSummary(p,catalog).unique,1);assert.equal(rosterSummary(p,catalog).rarityPoints,0);
});
test('answers are consumed once, wrong answers hurt, and special moves consume MP',()=>{
 let s=ready();const original=structuredClone(s),hp=s.mission.vitals[s.mission.active].hp,mp=s.mission.vitals[s.mission.active].mp;s=answer(s,'special');assert.ok(s.mission.vitals[s.mission.active].mp<mp);assert.ok(s.mission.enemy.hp<s.mission.enemy.maxHp);assert.equal(original.mission.phase,'question');assert.throws(()=>answer(s));s=run(s,{type:'next'});s=answer(s,'attack',false);assert.ok(s.mission.vitals[s.mission.active].hp<hp);assert.equal(s.profile.inventory.length,1);
});
test('capture needs weak HP, newly caught monsters can enter battle and their stats persist',()=>{
 let s=ready();assert.throws(()=>answer(s,'catch'));while(!canCatch(s.mission)){s=answer(s);assert.ok(!s.mission.result.finishedEncounter);s=run(s,{type:'next'});}s=answer(s,'catch',true,{random:()=>0});assert.equal(s.profile.totalCaught,1);assert.equal(s.mission.result.captured,true);const id=s.mission.captures[0];s=run(s,{type:'recruit',id});assert.equal(s.mission.active,id);assert.ok(s.profile.team.includes(id));s=run(s,{type:'next'});assert.equal(s.mission.active,id);assert.equal(s.mission.stage,1);assert.ok(s.mission.vitals[id].hp>0);
});
test('guardians require at least three successful attacks, mission rewards are applied once',()=>{
 let s=ready();s.mission.stage=5;s.mission.enemy.boss=true;s.mission.enemy.hp=5;s.mission.enemy.maxHp=5;s.mission.enemy.hits=0;
 s=answer(s);assert.equal(s.mission.enemy.hp,1);s=run(s,{type:'next'});s=answer(s);assert.equal(s.mission.enemy.hp,1);s=run(s,{type:'next'});s=answer(s);assert.equal(s.mission.result.finishedEncounter,true);s=run(s,{type:'next'});assert.equal(s.mission.phase,'complete');assert.equal(s.profile.adventures,1);assert.throws(()=>run(s,{type:'next'}));
});
test('three failed rare catch attempts allow escape and never grant a monster',()=>{
 let s=ready();s.mission.enemy.instance=makeMonster(catalog.find(s=>s.rarity==='Legendary'),{random});s.mission.enemy.hp=1;
 for(let i=0;i<3;i++){s=answer(s,'catch',true,{random:()=>.99});assert.equal(s.mission.result.captured,false);if(i<2){assert.equal(s.mission.result.escaped,false);s=run(s,{type:'next'});}}assert.equal(s.mission.result.escaped,true);assert.equal(s.profile.totalCaught,0);assert.equal(s.profile.inventory.length,1);
});
test('team wipe rescues everyone without deleting catches; legacy collection migrates',()=>{
 let s=ready();s.mission.vitals[s.mission.active].hp=1;s=answer(s,'attack',false);assert.equal(s.mission.result.rescued,true);s=run(s,{type:'next'});assert.equal(s.mission.phase,'rescued');assert.equal(s.profile.inventory.length,1);assert.equal(s.profile.adventures,0);
 const p=migrateLegacy({captured:{leaf:2,boss:1},adventures:4,bestScore:750,words:{hello:{correct:2,attempts:3}}},catalog,{random});assert.equal(p.inventory.length,3);assert.equal(new Set(p.inventory.map(x=>x.id)).size,3);assert.equal(p.totalCaught,3);assert.equal(p.adventures,4);assert.equal(p.bestScore,750);assert.equal(p.words.hello.correct,2);
});
test('course selection freezes for the entire mission and team changes require ownership',()=>{
 const cet=data.groups.find(g=>g.course==='CET');let s=run(run({profile:null,mission:null},{type:'starter',speciesId:'water'}),{type:'start',settings:{...settings,mode:'spell',scope:'custom',course:'CET',groupIds:[cet.id]}});assert.ok(s.mission.poolIds.every(id=>data.cards.find(c=>c.id===id).group_ids.includes(cet.id)));assert.equal(s.mission.question.mode,'spell');assert.throws(()=>run(s,{type:'team',ids:['forged']}));assert.throws(()=>run(s,{type:'recruit',id:s.profile.team[0]}));
});
