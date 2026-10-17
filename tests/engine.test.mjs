import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Adventure,selectPool,makeOptions,scramble,MONSTERS} from '../dist/engine.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/data/vocabulary.json',import.meta.url)));
let seed=15;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/2**32;}
test('all 231 source spellings are reachable, course/lesson filters have no leaks',()=>{
 assert.equal(selectPool(data).length,231);
 for(const group of data.groups){const selected=selectPool(data,group.course,[group.id]);const expected=new Set(data.occurrences.filter(o=>o.group_id===group.id).map(o=>o.english));assert.deepEqual(new Set(selected.map(c=>c.english)),expected);}
 assert.equal(selectPool(data,'CET',['fet-l01']).length,0);
});
test('each question has four unique choices and includes the spoken target',()=>{
 for(const group of data.groups){const pool=selectPool(data,group.course,[group.id]);for(const target of pool){const options=makeOptions(target,pool,random);assert.equal(options.length,4);assert.equal(new Set(options).size,4);assert.ok(options.includes(target.english));}}
});
test('letter tiles preserve every repeated letter and hyphen without presenting original order',()=>{
 for(const card of data.cards){const letters=scramble(card.english,random);assert.equal(new Set(letters.map(c=>c.id)).size,card.english.length);assert.equal(letters.map(c=>c.letter).sort().join(''),[...card.english].sort().join(''));if(new Set(card.english).size>1)assert.notEqual(letters.map(c=>c.letter).join(''),card.english);}
 assert.equal(scramble('grown-up',random).filter(t=>t.letter==='-').length,1);
});
test('five regular captures unlock boss; only correct answers reduce three boss HP',()=>{
 const a=new Adventure(selectPool(data),{random});assert.equal(a.stage,0);a.answer(false);assert.equal(a.stage,0);
 for(let i=0;i<5;i++){const r=a.answer(true);assert.equal(r.monster,i);assert.equal(r.captured,true);}
 assert.equal(a.boss,true);assert.equal(a.bossHp,3);a.answer(false);assert.equal(a.bossHp,3);
 assert.equal(a.answer(true).captured,false);assert.equal(a.bossHp,2);
 assert.equal(a.answer(true).captured,false);assert.equal(a.bossHp,1);
 assert.equal(a.answer(true).done,true);assert.equal(a.bossHp,0);assert.equal(a.done,true);assert.equal(a.correct,8);assert.equal(a.captures.length,MONSTERS.length);assert.equal(a.attempts,10);
});
test('word deck avoids repeats until exhaustion and avoids immediate repeat at refill',()=>{
 const pool=selectPool(data,'FET',['fet-l01']);const a=new Adventure(pool,{random});const words=pool.map(()=>a.draw().english);assert.equal(new Set(words).size,pool.length);assert.notEqual(a.draw().english,words.at(-1));assert.throws(()=>new Adventure([]));
});
