export const MONSTERS = [
  {id:'leaf',name:'芽芽兔',en:'Mochileaf',type:'森林系',color:'#63a978',description:'用葉子耳朵收集晨露，口袋裡總有一顆準備送給朋友的橡實。'},
  {id:'cloud',name:'星眠喵',en:'Lunapuff',type:'星空系',color:'#a398cf',description:'尾巴藏著一整片星空，打哈欠時會掉出小小的星光。'},
  {id:'honey',name:'蜜羽啾',en:'Sungriff',type:'陽光系',color:'#dbad47',description:'戴著最喜歡的橘色圍巾，一開心就會拍出蜂蜜香的微風。'},
  {id:'blossom',name:'櫻咕龍',en:'Sakurill',type:'花海系',color:'#e99baf',description:'閃亮的鰓像櫻花，最愛把海邊撿到的貝殼做成小飾品。'},
  {id:'water',name:'泡泡獺',en:'Wavotti',type:'水波系',color:'#65b1cd',description:'抱著水滴寶石，在浪花尾巴裡收藏每次冒險的回憶。'},
  {id:'boss',name:'花冠星龍',en:'Florastella',type:'星花守護者',color:'#ab8cce',description:'守護單字獸島的溫柔小龍。完成三道單字考驗，就能成為牠的朋友。'}
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
 constructor(pool,{random=Math.random}={}){if(!pool.length)throw Error('請至少選擇一個單字分組');this.pool=uniqueWords(pool);this.random=random;this.deck=[];this.stage=0;this.bossHp=3;this.captures=[];this.correct=0;this.attempts=0;this.lastWord=null;}
 get boss(){return this.stage===5;}
 get done(){return this.stage===6;}
 draw(){if(!this.deck.length)this.deck=shuffle(this.pool,this.random);if(this.deck.length>1&&this.deck.at(-1).english===this.lastWord)[this.deck[0],this.deck[this.deck.length-1]]=[this.deck.at(-1),this.deck[0]];const card=this.deck.pop();this.lastWord=card.english;return card;}
 answer(ok){this.attempts++;if(!ok)return {captured:false,done:false};this.correct++;if(this.boss){this.bossHp--;if(this.bossHp===0){this.captures.push(5);this.stage=6;return {captured:true,monster:5,done:true};}return {captured:false,done:false};}const monster=this.stage;this.captures.push(monster);this.stage++;return {captured:true,monster,done:false};}
}
