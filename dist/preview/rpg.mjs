import {selectPool,shuffle,makeOptions,scramble} from './engine.mjs';
export const MISSION_STAGES=4;
export const RARITIES=['Common','Uncommon','Rare','Epic','Legendary'];
export const UNLOCKS={Common:0,Uncommon:2,Rare:8,Epic:30,Legendary:80};
export const WEIGHTS={Common:75.85,Uncommon:18,Rare:5,Epic:1,Legendary:.15};
export const CATCH_RATES={Common:1,Uncommon:.9,Rare:.6,Epic:.35,Legendary:.15};
export const STAT_KEYS=['hp','mp','attack','defense','special'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const int=(n,fallback=0)=>Number.isFinite(n)?Math.floor(n):fallback;
const randomId=()=>globalThis.crypto.randomUUID();
export function encounterOdds(missions,mode='choice'){
 const weights=Object.fromEntries(RARITIES.map(r=>[r,missions>=UNLOCKS[r]?WEIGHTS[r]*(RARITIES.indexOf(r)>=2?(mode==='spell'?1.15:mode==='mixed'?1.075:1):1):0]));
 const sum=Object.values(weights).reduce((a,b)=>a+b,0);return Object.fromEntries(RARITIES.map(r=>[r,weights[r]/sum]));
}
function weighted(values,weight,random){let roll=random()*values.reduce((n,x)=>n+weight(x),0);for(const x of values){roll-=weight(x);if(roll<0)return x;}return values.at(-1);}
export function chooseSpecies(catalog,missions,mode,random=Math.random){const odds=encounterOdds(missions,mode);const rarity=weighted(RARITIES,r=>odds[r],random);const choices=catalog.filter(s=>s.rarity===rarity);return choices[Math.floor(random()*choices.length)];}
export function makeMonster(species,{level=5,origin='caught',random=Math.random,id=randomId(),now=Date.now()}={}){
 return {id,speciesId:species.id,level:clamp(int(level,5),1,50),xp:0,iv:Object.fromEntries(STAT_KEYS.map(k=>[k,Math.floor(random()*32)])),nature:Math.floor(random()*5),origin,caughtAt:new Date(now).toISOString()};
}
export function monsterStats(monster,catalog){
 const s=catalog.find(s=>s.id===monster.speciesId);if(!s)throw Error('Unknown monster species.');
 const level=clamp(int(monster.level,5),1,50),favored=STAT_KEYS[clamp(int(monster.nature),0,4)];
 return Object.fromEntries(STAT_KEYS.map(k=>[k,Math.round((s.baseStats[k]+(monster.iv?.[k]||0)*.35+(level-5)*(k==='hp'?3:k==='mp'?1.5:1.2))*(k===favored?1.05:1))]));
}
export function quality(monster){return Math.round(STAT_KEYS.reduce((n,k)=>n+(monster.iv[k]||0),0)/155*100);}
export function newProfile(starterId,catalog,opts={}){if(!['leaf','honey','water'].includes(starterId))throw Error('Choose a starter.');const m=makeMonster(catalog.find(s=>s.id===starterId),{...opts,origin:'starter'});return {schemaVersion:2,inventory:[m],team:[m.id],adventures:0,totalCaught:0,totalAnswers:0,correct:0,bestScore:0,words:{}};}
export function migrateLegacy(legacy,catalog,opts={}){
 const profile=newProfile('leaf',catalog,opts);profile.inventory=[];profile.team=[];
 for(const s of catalog){const count=clamp(int(legacy?.captured?.[s.id]),0,1000);for(let i=0;i<count;i++)profile.inventory.push(makeMonster(s,{...opts,origin:'legacy'}));}
 if(!profile.inventory.length)return newProfile('leaf',catalog,opts);
 profile.team=profile.inventory.slice(0,3).map(m=>m.id);profile.totalCaught=profile.inventory.length;profile.adventures=clamp(int(legacy.adventures),0,100000);profile.words=legacy.words||{};profile.bestScore=int(legacy.bestScore);return profile;
}
export function rosterSummary(profile,catalog){
 const counts=Object.fromEntries(RARITIES.map(r=>[r,0]));for(const m of profile.inventory){if(m.origin==='starter')continue;const s=catalog.find(s=>s.id===m.speciesId);if(s)counts[s.rarity]++;}
 return {caught:profile.totalCaught,owned:profile.inventory.length,unique:new Set(profile.inventory.map(m=>m.speciesId)).size,rarities:counts,rarityPoints:RARITIES.reduce((n,r,i)=>n+counts[r]*[1,3,10,35,150][i],0),missions:profile.adventures};
}
export function setTeam(profile,ids){if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!profile.inventory.some(m=>m.id===id)))throw Error('Choose one to three owned teammates.');profile.team=[...ids];}
export function beginMission(profile,settings,data,catalog,{random=Math.random,now=Date.now()}={}){
 if(!profile.team?.length)throw Error('Choose your team first.');
 if(!['choice','spell','mixed'].includes(settings.mode)||!['ALL','CET','FET'].includes(settings.course)||!['all','custom'].includes(settings.scope))throw Error('Choose a valid mission.');
 if(![15,25,40].includes(settings.seconds))throw Error('Choose 15, 25, or 40 seconds.');
 if(settings.scope==='custom'&&(!Array.isArray(settings.groupIds)||!settings.groupIds.length))throw Error('Choose a Week or Lesson.');
 const pool=selectPool(data,settings.course,settings.scope==='all'?[]:settings.groupIds);if(!pool.length)throw Error('Choose at least one word unit.');
 const mission={id:randomId(),settings:{mode:settings.mode,course:settings.course,scope:settings.scope,groupIds:[...(settings.groupIds||[])],timed:!!settings.timed,seconds:settings.seconds},poolIds:pool.map(c=>c.id),deck:[],lastWord:null,stage:0,correct:0,attempts:0,score:0,captures:[],defeated:0,phase:'question',active:profile.team[0],vitals:{},question:null,result:null,startedAt:now,stagesTotal:MISSION_STAGES,seen:[],egg:null};
 for(const id of profile.team){const stats=monsterStats(profile.inventory.find(m=>m.id===id),catalog);mission.vitals[id]={hp:stats.hp,mp:stats.mp};}
 spawnEnemy(mission,profile,catalog,random,now);drawQuestion(mission,data,random,now);return mission;
}
function spawnEnemy(mission,profile,catalog,random,now){
 const s=chooseSpecies(catalog,profile.adventures,mission.settings.mode,random),leader=profile.inventory.find(m=>m.id===mission.active)||profile.inventory[0];
 const instance=makeMonster(s,{level:clamp(leader.level+Math.floor(random()*3)-1,3,50),random,now});const stats=monsterStats(instance,catalog),boss=mission.stage===MISSION_STAGES-1;
 mission.seen??=[];if(!mission.seen.includes(s.id))mission.seen.push(s.id);
 mission.enemy={instance,hp:Math.round(stats.hp*(boss?1.45:1)),maxHp:Math.round(stats.hp*(boss?1.45:1)),mp:stats.mp,catchAttempts:0,hits:0,boss};mission.encounterAnswers=0;
}
function drawQuestion(mission,data,random,now){
 const pool=data.cards.filter(c=>mission.poolIds.includes(c.id));if(!mission.deck.length)mission.deck=shuffle(pool.map(c=>c.id),random);
 if(mission.deck.length>1&&data.cards.find(c=>c.id===mission.deck.at(-1))?.english===mission.lastWord)[mission.deck[0],mission.deck[mission.deck.length-1]]=[mission.deck.at(-1),mission.deck[0]];
 const cardId=mission.deck.pop(),card=data.cards.find(c=>c.id===cardId);mission.lastWord=card.english;
 const mode=mission.settings.mode==='mixed'?(mission.attempts%2===0?'choice':'spell'):mission.settings.mode;
 mission.question={id:randomId(),cardId,mode,options:makeOptions(card,pool,random),letters:scramble(card.english,random),issuedAt:now};mission.phase='question';mission.result=null;
}
export function activeMonster(profile,mission){return profile.inventory.find(m=>m.id===mission.active);}
export function switchMonster(profile,mission,id){if(!profile.team.includes(id)||!mission.vitals[id]?.hp)throw Error('Choose a ready teammate.');mission.active=id;}
export function specialCost(species){return species.type==='VOLT'?10:12;}
export function canCatch(mission){return mission.enemy.hp<=mission.enemy.maxHp*.35;}
export function damageAmount(attacker,defender,{special=false,attackerType,defenderType,random=Math.random}={}){
 let damage=(special?attacker.special*1.5:attacker.attack)*.62-defender.defense*.18;
 if(attackerType==='FIRE'&&!special)damage*=1.1;if(attackerType==='STORM')damage*=1.08;if(attackerType==='FROST'&&special)damage*=1.1;if(attackerType==='SHADE'&&special)damage+=defender.defense*.15;
 if(defenderType==='LEAF')damage*=.9;if(defenderType==='STONE'&&!special)damage*=.85;if(defenderType==='WATER'&&special)damage*=.9;if(defenderType==='METAL')damage-=3;
 return Math.max(3,Math.round(damage*(.94+random()*.12)));
}
function grantXP(profile,mission,catalog,amount){const m=activeMonster(profile,mission);if(m.level>=50)return;m.xp+=amount;while(m.level<50&&m.xp>=m.level*35){m.xp-=m.level*35;m.level++;const s=monsterStats(m,catalog);mission.vitals[m.id].hp=Math.min(s.hp,mission.vitals[m.id].hp+3);mission.vitals[m.id].mp=Math.min(s.mp,mission.vitals[m.id].mp+2);}}
export function answerQuestion(profile,mission,input,data,catalog,{random=Math.random,now=Date.now()}={}){
 if(!mission||mission.phase!=='question'||input.questionId!==mission.question.id)throw Error('This word has already been answered. Continue to the next word.');
 if(!['attack','special','catch'].includes(input.intent))throw Error('Choose Attack, Special, or Catch.');
 const card=data.cards.find(c=>c.id===mission.question.cardId),m=activeMonster(profile,mission),species=catalog.find(s=>s.id===m.speciesId),wild=catalog.find(s=>s.id===mission.enemy.instance.speciesId),stats=monsterStats(m,catalog),wildStats=monsterStats(mission.enemy.instance,catalog),vitals=mission.vitals[m.id];
 if(input.intent==='special'&&vitals.mp<specialCost(species))throw Error('Not enough MP. Use Attack to recharge.');
 if(input.intent==='catch'&&!canCatch(mission))throw Error('Lower the wild monster to 35% HP first.');
 // Each question nonce can award rewards once; the server owns all rolls and inventory changes.
 const correct=!input.timeout&&typeof input.answer==='string'&&input.answer.toLowerCase()===card.english;
 mission.attempts++;mission.encounterAnswers++;profile.totalAnswers++;mission.phase='result';
 const result={correct,intent:input.intent,cardId:card.id,captured:false,escaped:false,damage:0,counterDamage:0,points:0,message:'',finishedEncounter:false,rescued:false};
 const record=profile.words[card.english]||{correct:0,attempts:0};record.attempts++;if(correct){record.correct++;record.lastPracticed=new Date(now).toISOString();}profile.words[card.english]=record;
 if(correct){mission.correct++;profile.correct++;result.points=input.hint?50:100;mission.score+=result.points;grantXP(profile,mission,catalog,12);
  if(species.type==='LIGHT')vitals.hp=Math.min(stats.hp,vitals.hp+5);
  if(input.intent==='catch'){
   mission.enemy.catchAttempts++;
   if(random()<CATCH_RATES[wild.rarity]){const caught={...mission.enemy.instance,id:randomId(),caughtAt:new Date(now).toISOString()};profile.inventory.push(caught);profile.totalCaught++;mission.captures.push(caught.id);result.captured=true;result.finishedEncounter=true;result.message=`Caught ${wild.name}! Open Warehouse to put it on your team.`;grantXP(profile,mission,catalog,30);}
   else{result.message=`${wild.name} broke free. Try another word!`;if(mission.enemy.catchAttempts>=3){result.escaped=true;result.finishedEncounter=true;result.message=`${wild.name} escaped. Keep training for another encounter!`;}}
  }else{
   const special=input.intent==='special';if(special)vitals.mp-=specialCost(species);else vitals.mp=Math.min(stats.mp,vitals.mp+(species.type==='WIND'?6:4));
   mission.enemy.hits++;result.damage=Math.max(damageAmount(stats,wildStats,{special,attackerType:species.type,defenderType:wild.type,random}),Math.ceil(mission.enemy.maxHp*(mission.enemy.boss?(special?.36:.23):(special?.68:.38))));mission.enemy.hp=Math.max(0,mission.enemy.hp-result.damage);
   // A guardian needs at least three successful attacks even with a very strong teammate.
   if(mission.enemy.boss&&mission.enemy.hits<3)mission.enemy.hp=Math.max(1,mission.enemy.hp);
   result.message=`${m.name||species.name} used ${special?species.specialMove:'Attack'}! ${result.damage} damage.`;
   if(mission.enemy.hp>0&&mission.enemy.hp<=mission.enemy.maxHp*.06&&(!mission.enemy.boss||mission.enemy.hits>=3)){result.damage+=mission.enemy.hp;mission.enemy.hp=0;}
   if(mission.enemy.hp===0){result.finishedEncounter=true;mission.defeated++;grantXP(profile,mission,catalog,25);result.message+=` ${wild.name} retreated. Use Catch below 35% HP next time.`;}
  }
 }else{
  result.enemySpecial=mission.enemy.mp>=specialCost(wild)&&random()<.28;if(result.enemySpecial)mission.enemy.mp-=specialCost(wild);result.counterDamage=damageAmount(wildStats,stats,{special:result.enemySpecial,attackerType:wild.type,defenderType:species.type,random});vitals.hp=Math.max(0,vitals.hp-result.counterDamage);result.message=`${wild.name} attacked! −${result.counterDamage} HP. Listen and try the next word.`;
  if(!vitals.hp){const ready=profile.team.find(id=>mission.vitals[id].hp>0);if(ready){mission.active=ready;result.message+=' Your next teammate steps in!';}else{result.rescued=true;result.finishedEncounter=true;result.message='Your team needs a rest. The rescue crew brought everyone home safely.';}}
 }
 mission.result=result;return result;
}
export function advanceMission(profile,mission,data,catalog,{random=Math.random,now=Date.now()}={}){
 if(mission.phase!=='result')throw Error('Answer the current word first.');
 if(mission.result.rescued){mission.phase='rescued';return;}
 if(mission.result.finishedEncounter){mission.stage++;if(mission.stage===MISSION_STAGES){mission.phase='complete';profile.adventures++;profile.bestScore=Math.max(profile.bestScore,mission.score);const seen=mission.seen?.length?mission.seen:[mission.enemy.instance.speciesId];mission.egg={speciesId:seen[Math.floor(random()*seen.length)],hatched:false,monsterId:null};return;}spawnEnemy(mission,profile,catalog,random,now);}
 drawQuestion(mission,data,random,now);
}
export function reduceGame(state,action,data,catalog,opts={}){
 const next=structuredClone(state);switch(action.type){
 case 'starter':if(next.profile)throw Error('A starter has already joined your team.');next.profile=newProfile(action.speciesId,catalog,opts);break;
 case 'start':if(next.mission?.egg&&!next.mission.egg.hatched)throw Error('Hatch your discovery egg first.');if(next.mission?.phase==='question'||next.mission?.phase==='result')throw Error('Finish or leave your current mission first.');next.mission=beginMission(next.profile,action.settings,data,catalog,opts);break;
 case 'restart':if(next.mission?.egg&&!next.mission.egg.hatched)throw Error('Hatch your discovery egg first.');if(!['question','result'].includes(next.mission?.phase))throw Error('No active mission to restart.');next.mission=beginMission(next.profile,action.settings,data,catalog,opts);break;
 case 'answer':answerQuestion(next.profile,next.mission,action,data,catalog,opts);break;
 case 'next':advanceMission(next.profile,next.mission,data,catalog,opts);break;
 case 'recruit':{const m=next.mission,inst=next.profile.inventory.find(x=>x.id===action.id);if(!m||m.phase!=='result'||!m.captures.includes(action.id)||!inst)throw Error('Catch this teammate first.');if(!next.profile.team.includes(inst.id)){if(next.profile.team.length===3)next.profile.team=next.profile.team.filter(id=>id!==m.active);next.profile.team.push(inst.id);}const stats=monsterStats(inst,catalog);m.vitals[inst.id]??={hp:stats.hp,mp:stats.mp};m.active=inst.id;break;}
 case 'team':if(next.mission?.phase==='question'||next.mission?.phase==='result')throw Error('Return to base before changing your team.');setTeam(next.profile,action.ids);break;
 case 'switch':if(next.mission?.phase!=='question')throw Error('Continue to the next word first.');switchMonster(next.profile,next.mission,action.id);break;
 case 'hatch':{const mission=next.mission;if(mission?.phase!=='complete'||!mission.egg)throw Error('Finish your mission to find an egg.');if(mission.egg.hatched)break;const found=catalog.find(s=>s.id===mission.egg.speciesId);if(!found||!mission.seen.includes(found.id))throw Error('This egg does not belong to this mission.');const leader=next.profile.inventory.find(m=>m.id===mission.active),friend=makeMonster(found,{...opts,level:leader?.level||5,origin:'egg'});next.profile.inventory.push(friend);next.profile.totalCaught++;mission.captures.push(friend.id);mission.egg.hatched=true;mission.egg.monsterId=friend.id;break;}
 case 'leave':if(next.mission?.egg&&!next.mission.egg.hatched)throw Error('Hatch your discovery egg first.');next.mission=null;break;
 default:throw Error('Unknown game action.');}
 return next;
}
