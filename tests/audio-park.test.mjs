import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseAmericanVoice,musicStep} from '../dist/audio.mjs';
import {walkToward} from '../dist/park.mjs';
import {BattleAction,MONSTER_MOVES} from '../dist/battle.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../dist/'+name,import.meta.url)));
test('every source spelling has its own finite US audio clip, including read and grown-up',()=>{
 const words=new Set(read('data/vocabulary.json').cards.map(c=>c.english));const manifest=read('assets/american-voice.json');
 assert.equal(manifest.locale,'en-US');assert.deepEqual(new Set(Object.keys(manifest.words)),words);
 const seconds=readFileSync(new URL('../dist/assets/american-voice.mp3',import.meta.url)).length*8/48000;
 for(const clip of Object.values(manifest.words)){assert.ok(clip.start>=0&&clip.duration>.1&&clip.start+clip.duration<=seconds);}
 const cues=read('assets/battle-voices-v3.json');for(const key of ['@attack','@hurt','@capture','@hit','@victory','@pet'])assert.ok(cues.words[key]?.text&&cues.words[key].duration>.1);
});
test('speech fallback prefers a natural American voice and never picks British or novelty voices',()=>{
 const list=[{name:'Ava Natural',lang:'en-GB'},{name:'Boing',lang:'en-US'},{name:'Samantha',lang:'en-US'},{name:'Jenny Online (Natural)',lang:'en-US'}];assert.equal(chooseAmericanVoice(list).name,'Jenny Online (Natural)');assert.equal(chooseAmericanVoice(list.slice(0,2)),null);
});
test('field, garden and boss scores loop safely and have distinct tempos',()=>{
 assert.equal(musicStep('park',0).bpm,88);assert.equal(musicStep('boss',0).bpm,126);
 for(const scene of ['home','park','boss'])for(let i=0;i<256;i++){const step=musicStep(scene,i);assert.ok(step.chord.every(Number.isFinite));assert.ok(Number.isFinite(step.melody));assert.equal(step.melody,musicStep(scene,i+64).melody);}
});
test('wandering steps respect pixel speed, reach targets without overshooting and survive hidden layout',()=>{
 const from={x:.2,y:.3},target={x:.8,y:.7};const next=walkToward(from,target,30,.5,800,500);assert.ok(Math.abs(Math.hypot((next.x-from.x)*800,(next.y-from.y)*500)-15)<1e-8);
 const arrived=walkToward(from,target,10000,1,800,500);assert.equal(arrived.x,target.x);assert.equal(arrived.y,target.y);assert.equal(arrived.arrived,true);
 assert.deepEqual(walkToward(from,target,30,.5,0,0),{...from,arrived:false});
});
function mockArena(){const set=new Set(),removed=[];const node={classList:{add:(...v)=>v.forEach(x=>set.add(x)),remove:(...v)=>v.forEach(x=>set.delete(x))},querySelector:()=>node,querySelectorAll:()=>[{remove:()=>removed.push(true)}],insertAdjacentHTML:()=>{}};return {node,set,removed};}
test('leaving during a counterattack cancels every pending delay and cleans effects',async()=>{
 const {node,set,removed}=mockArena();let stopped=false;const action=new BattleAction(node,{cry(){},effect(){}},{stop(){stopped=true;}});const pending=action.play('wrong',0);assert.equal(action.timers.size,1);action.cancel();await pending;assert.equal(action.timers.size,0);assert.ok(stopped);assert.ok(!set.has('counterattack'));assert.ok(removed.length);assert.equal(MONSTER_MOVES.length,6);
});
test('leaving during a voiced line releases the waiting animation immediately',async()=>{
 const {node}=mockArena();const action=new BattleAction(node,{}, {play:()=>Promise.resolve(),stop(){}});const pending=action.voice('@hurt');action.cancel();await pending;assert.equal(action.timers.size,0);
});

test('existing players receive the quieter voice-first mix once, without losing preferences',async()=>{
 const {migrateAudioSettings}=await import('../dist/audio.mjs');
 const updated=migrateAudioSettings({musicVolume:.32,sfxVolume:.5,voiceVolume:.6,music:false,mode:'spell',groupIds:['cet-w03']});
 assert.equal(updated.musicVolume,.12);assert.equal(updated.sfxVolume,.35);assert.equal(updated.voiceVolume,1);assert.equal(updated.music,false);assert.equal(updated.mode,'spell');assert.deepEqual(updated.groupIds,['cet-w03']);
 assert.equal(migrateAudioSettings({...updated,musicVolume:.2}).musicVolume,.2);
});
test('speech silences music and reverb even at full music volume, while keeping the voice clear',async()=>{
 const {audioMix}=await import('../dist/audio.mjs');const settings={music:true,sfx:true,musicVolume:1,sfxVolume:.5,voiceVolume:1};
 const speaking=audioMix(settings,{ducked:true});assert.equal(speaking.music,0);assert.equal(speaking.reverb,0);assert.equal(speaking.voice,1);assert.equal(speaking.effects,.06);
 assert.equal(audioMix(settings).music,1);assert.equal(audioMix(settings,{visible:false}).music,0);
});
