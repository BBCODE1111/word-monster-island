export const CARE_LIMIT=3;
export const REST_MS=30*60*1000;
export function careStatus(monster,now=Date.now()){
 const saved=monster.care||{},bond=Math.max(0,Math.min(100,Number(saved.bond)||0));
 const sleeping=Number(saved.restUntil)>now;
 const uses=sleeping?CARE_LIMIT:saved.restUntil?0:Math.max(0,Math.min(CARE_LIMIT,Number(saved.uses)||0));
 return {bond,uses,sleeping,mood:sleeping?'sleeping':uses>=2?'tired':'awake',restUntil:sleeping?saved.restUntil:0};
}
export function careFor(monster,kind,now=Date.now()){
 if(!['feed','pet','train'].includes(kind))throw Error('Choose Snack, Pet, or Train.');
 const current=careStatus(monster,now);
 if(current.sleeping)throw Error('Your friend is sleeping. Let them rest.');
 const uses=current.uses+1;
 monster.care={bond:Math.min(100,current.bond+2),uses,restUntil:uses>=CARE_LIMIT?now+REST_MS:0};
 return careStatus(monster,now);
}
