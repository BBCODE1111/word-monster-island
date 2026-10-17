export const MONSTERS = [
 {id:'leaf',name:'Budbolt',en:'LEAF RUNNER',type:'LEAF',color:'#60a83c',description:'Blade-shaped ears slice through tall grass. Fast feet, brave heart.'},
 {id:'cloud',name:'Sparklynx',en:'VOLT SCOUT',type:'VOLT',color:'#338ab5',description:'A quick scout with a lightning tail. Its sharp ears sense a storm before it arrives.'},
 {id:'honey',name:'Dashwing',en:'SKY STRIKER',type:'WIND',color:'#ed9c32',description:'Golden wing blades cut through the wind. Always first to spot the next challenge.'},
 {id:'blossom',name:'Emberax',en:'MAGMA DRAKE',type:'FIRE',color:'#d75937',description:'A tough little drake with warm armor plates. It charges into every mission with courage.'},
 {id:'water',name:'Tiderush',en:'SURF GUARD',type:'WATER',color:'#219fbc',description:'Armored paws and a powerful paddle tail. This sea scout never leaves a teammate behind.'},
 {id:'boss',name:'Stormcrest',en:'RIDGE GUARDIAN',type:'STORM',color:'#287d99',description:'Guardian of Frontier Ridge. Land three word links to earn its trust and recruit it to your team.'}
];
export function shuffle(items, random=Math.random) {
 const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function uniqueWords(cards){return [...new Map(cards.map(c=>[c.english,c])).values()];}
export function selectPool(data,course='ALL',groupIds=[]){
 const allowed=new Set(groupIds);
 return uniqueWords(data.cards.filter(c=> (course==='ALL'||c.courses.includes(course)) && (!allowed.size||c.group_ids.some(id=>allowed.has(id)))));
}
export function makeOptions(target,pool,random=Math.random){
 const alternatives=shuffle(uniqueWords(pool).filter(c=>c.english!==target.english),random).slice(0,3);
 return shuffle([target,...alternatives],random).map(c=>c.english);
}
export function scramble(word,random=Math.random){
 const original=[...word], letters=shuffle(original,random);
 if(letters.join('')===word && new Set(original).size>1){for(let i=1;i<letters.length;i++){if(letters[i]!==letters[0]){[letters[0],letters[i]]=[letters[i],letters[0]];break;}}}
 return letters.map((letter,id)=>({id,letter}));
}
export class Adventure {
 constructor(pool,{random=Math.random}={}){if(!pool.length)throw Error('Choose at least one word unit.');this.pool=uniqueWords(pool);this.random=random;this.deck=[];this.stage=0;this.bossHp=3;this.captures=[];this.correct=0;this.attempts=0;this.lastWord=null;}
 get boss(){return this.stage===5;}
 get done(){return this.stage===6;}
 draw(){if(!this.deck.length)this.deck=shuffle(this.pool,this.random);if(this.deck.length>1&&this.deck.at(-1).english===this.lastWord)[this.deck[0],this.deck[this.deck.length-1]]=[this.deck.at(-1),this.deck[0]];const card=this.deck.pop();this.lastWord=card.english;return card;}
 answer(ok){this.attempts++;if(!ok)return {captured:false,done:false};this.correct++;if(this.boss){this.bossHp--;if(this.bossHp===0){this.captures.push(5);this.stage=6;return {captured:true,monster:5,done:true};}return {captured:false,done:false};}const monster=this.stage;this.captures.push(monster);this.stage++;return {captured:true,monster,done:false};}
}
