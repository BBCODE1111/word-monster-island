import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reduceGame,MISSION_STAGES,canCatch} from '../dist/preview/rpg.mjs';
import {ReviewClock} from '../dist/preview/auto-advance.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/data/vocabulary.json',import.meta.url))),catalog=JSON.parse(readFileSync(new URL('../dist/data/monsters.json',import.meta.url)));
const settings={mode:'choice',course:'ALL',scope:'all',groupIds:[],timed:false,seconds:25};
function game(seed=1){let value=seed;const random=()=>{value=(value*1664525+1013904223)>>>0;return value/2**32;};let state={profile:null,mission:null};const act=a=>state=reduceGame(state,a,data,catalog,{random});act({type:'starter',speciesId:'leaf'});act({type:'start',settings});return{act,get state(){return state;},answer(intent='attack',ok=true){const q=state.mission.question;return act({type:'answer',questionId:q.id,intent,answer:ok?data.cards.find(c=>c.id===q.cardId).english:'wrong'});}};}
test('ordinary encounters take at most 3 basic answers and guardians at most 5, across encounter rolls',()=>{
 for(let seed=1;seed<=30;seed++){const g=game(seed);let encounter=0,hits=0;while(g.state.mission.phase!=='complete'){g.answer();hits++;if(g.state.mission.result.finishedEncounter){assert.ok(hits<=(encounter===3?5:3),`seed ${seed} stage ${encounter}: ${hits}`);assert.ok(encounter!==3||hits>=3);encounter++;hits=0;}g.act({type:'next'});}assert.equal(encounter,MISSION_STAGES);assert.equal(g.state.profile.adventures,1);}
});
test('a mission without any catches still grants an encountered species, exactly once, after hatching',()=>{
 const g=game(7);while(g.state.mission.phase!=='complete'){g.answer();g.act({type:'next'});}const m=g.state.mission;assert.equal(g.state.profile.totalCaught,0);assert.ok(m.seen.includes(m.egg.speciesId));assert.equal(m.egg.hatched,false);assert.throws(()=>g.act({type:'start',settings}),/Hatch/);assert.throws(()=>g.act({type:'leave'}),/Hatch/);
 const restored=JSON.parse(JSON.stringify(g.state));const hatched=reduceGame(restored,{type:'hatch'},data,catalog);assert.equal(hatched.profile.inventory.length,2);assert.equal(hatched.profile.totalCaught,1);assert.equal(hatched.mission.captures.length,1);assert.equal(hatched.profile.inventory.at(-1).speciesId,m.egg.speciesId);const twice=reduceGame(hatched,{type:'hatch'},data,catalog);assert.deepEqual(twice,hatched);assert.throws(()=>reduceGame(twice,{type:'next'},data,catalog));
});
test('catch remains available after two basic attacks and discovery eggs add to earlier catches',()=>{
 const g=game(11);g.answer();g.act({type:'next'});g.answer();assert.ok(canCatch(g.state.mission));assert.equal(g.state.mission.result.finishedEncounter,false);g.act({type:'next'});g.answer('catch');assert.equal(g.state.profile.totalCaught,1);g.act({type:'next'});while(g.state.mission.phase!=='complete'){g.answer();g.act({type:'next'});}g.act({type:'hatch'});assert.equal(g.state.profile.totalCaught,2);assert.equal(g.state.mission.captures.length,2);
});
test('a rescue preserves progress and cannot award a discovery egg',()=>{const g=game(8);g.state.mission.vitals[g.state.mission.active].hp=1;g.answer('attack',false);g.act({type:'next'});assert.equal(g.state.mission.phase,'rescued');assert.equal(g.state.mission.egg,null);assert.throws(()=>g.act({type:'hatch'}));assert.equal(g.state.profile.inventory.length,1);});
test('review waits for speech, freezes while paused or held, and advances only once',()=>{
 const c=new ReviewClock();c.reset('q1',1600);assert.equal(c.tick(9000),false);assert.equal(c.remaining,1600);c.arm('old-question');assert.equal(c.ready,false);c.arm('q1');c.tick(500);c.tick(9000,{active:false});assert.equal(c.remaining,1100);c.hold(true);c.tick(9000);assert.equal(c.remaining,1100);c.hold(false);assert.equal(c.tick(1099),false);assert.equal(c.tick(1),true);assert.equal(c.tick(9999),false);c.reset('q2',3000);c.arm('q1');assert.equal(c.ready,false);c.cancel();assert.equal(c.tick(9999),false);
});
