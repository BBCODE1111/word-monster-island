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
test('restarting an unfinished mission uses the newly selected course and preserves collection, XP and records',()=>{
 const g=game(11);g.answer();g.act({type:'next'});g.answer();g.act({type:'next'});g.answer('catch');
 const profile=structuredClone(g.state.profile),oldId=g.state.mission.id,oldQuestion=g.state.mission.question.id;
 const selected={...settings,mode:'spell',scope:'custom',course:'FET',groupIds:['fet-l07']};
 g.act({type:'restart',settings:selected});
 assert.deepEqual(g.state.profile,profile);assert.equal(g.state.profile.totalCaught,1);assert.notEqual(g.state.mission.id,oldId);
 assert.equal(g.state.mission.stage,0);assert.equal(g.state.mission.score,0);assert.equal(g.state.mission.question.mode,'spell');
 assert.deepEqual(g.state.mission.settings.groupIds,['fet-l07']);assert.ok(g.state.mission.poolIds.every(id=>data.cards.find(c=>c.id===id).group_ids.includes('fet-l07')));
 assert.throws(()=>g.act({type:'answer',questionId:oldQuestion,intent:'attack',answer:'old answer'}));
 const before=structuredClone(g.state);assert.throws(()=>g.act({type:'restart',settings:{...selected,groupIds:[]}}));assert.deepEqual(g.state,before);
});
test('restart cannot bypass an unhatched discovery egg',()=>{
 const g=game(7);while(g.state.mission.phase!=='complete'){g.answer();g.act({type:'next'});}
 const before=structuredClone(g.state);assert.throws(()=>g.act({type:'restart',settings}),/Hatch/);assert.deepEqual(g.state,before);
});

test('an egg friend can lead the very next mission, with its own stats and vitals',()=>{
 const g=game(7);while(g.state.mission.phase!=='complete'){g.answer();g.act({type:'next'});}g.act({type:'hatch'});
 const friend=g.state.profile.inventory.at(-1);assert.ok(g.state.profile.team.includes(friend.id));g.act({type:'deploy',id:friend.id});g.act({type:'start',settings});
 assert.equal(g.state.mission.active,friend.id);assert.ok(g.state.mission.vitals[friend.id].hp>0);assert.equal(g.state.profile.inventory.length,2);
});
test('owned friends outside a full team can deploy without healing returning teammates or changing the question',()=>{
 const g=game(11);const p=g.state.profile,original=p.team[0];
 for(let i=0;i<3;i++)p.inventory.push({...structuredClone(p.inventory[0]),id:'friend-'+i});p.team.push('friend-0','friend-1');
 const q=g.state.mission.question.id;g.state.mission.vitals[original]={hp:12,mp:7};g.act({type:'deploy',id:'friend-2'});
 assert.equal(g.state.mission.active,'friend-2');assert.equal(g.state.profile.team.length,3);assert.ok(!g.state.profile.team.includes(original));assert.equal(g.state.mission.question.id,q);
 g.act({type:'deploy',id:original});assert.deepEqual(g.state.mission.vitals[original],{hp:12,mp:7});
 g.state.mission.vitals['friend-2'].hp=0;assert.throws(()=>g.act({type:'deploy',id:'friend-2'}),/recover/);assert.throws(()=>g.act({type:'deploy',id:'not-owned'}),/own monsters/);
});
test('a catch can deploy after automatic advancement, even when the catch-result button was missed',()=>{
 const g=game(11);g.answer();g.act({type:'next'});g.answer();g.act({type:'next'});g.answer('catch');const caught=g.state.profile.inventory.at(-1);
 g.act({type:'next'});g.act({type:'deploy',id:caught.id});assert.equal(g.state.mission.active,caught.id);assert.equal(g.state.mission.stage,1);
});
test('friendship is individual, grows slowly, and three mixed activities trigger persistent sleep',async()=>{
 const {careStatus,REST_MS}=await import('../dist/preview/care.mjs');const g=game(3),id=g.state.profile.inventory[0].id;
 g.state.profile.inventory.push({...structuredClone(g.state.profile.inventory[0]),id:'same-species-friend'});
 const care=(state,kind,now)=>reduceGame(state,{type:'care',id,kind},data,catalog,{now});
 let s=care(g.state,'pet',1000);s=care(s,'train',2000);assert.equal(careStatus(s.profile.inventory[0],2000).mood,'tired');s=care(s,'feed',3000);
 const m=s.profile.inventory[0];assert.equal(m.care.bond,6);assert.equal(careStatus(m,3000).sleeping,true);assert.equal(careStatus(s.profile.inventory[1],3000).bond,0);assert.equal(s.profile.inventory[0].xp,0);
 const restored=JSON.parse(JSON.stringify(s));for(const kind of ['pet','train','feed'])assert.throws(()=>care(restored,kind,3001),/sleeping/);assert.deepEqual(restored,s);
 const awake=care(s,'pet',3000+REST_MS);assert.equal(awake.profile.inventory[0].care.bond,8);assert.equal(careStatus(awake.profile.inventory[0],3000+REST_MS).uses,1);
});
test('care rejects unowned monsters and invalid actions, and friendship caps without bypassing rest',async()=>{
 const {careFor,careStatus}=await import('../dist/preview/care.mjs');const g=game(),id=g.state.profile.inventory[0].id;
 assert.throws(()=>g.act({type:'care',id:'fake',kind:'pet'}),/own monsters/);assert.throws(()=>g.act({type:'care',id,kind:'spam'}),/Choose/);
 const m={care:{bond:99,uses:2,restUntil:0}};careFor(m,'train',1000);assert.equal(careStatus(m,1000).bond,100);assert.equal(careStatus(m,1000).sleeping,true);
});
