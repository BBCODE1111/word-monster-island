import {moveArt} from './battle.mjs';
export function walkToward(position,target,speed,seconds,width,height){if(width<=0||height<=0)return {...position,arrived:false};const dx=(target.x-position.x)*width,dy=(target.y-position.y)*height,distance=Math.hypot(dx,dy),travel=Math.min(distance,speed*seconds);if(distance<1)return {...target,arrived:true};return {x:position.x+dx/distance*travel/width,y:position.y+dy/distance*travel/height,arrived:travel===distance};}
export class MonsterPark{
 constructor(world,monsters,{onActivity=()=>{}}={}){this.world=world;this.onActivity=onActivity;this.last=0;this.stopped=false;this.busy=false;this.timers=new Map();this.width=world.clientWidth;this.height=world.clientHeight;this.creatures=monsters.map((m,i)=>({...m,node:world.querySelector(`[data-park-id="${m.id}"]`),position:{x:.24+(i%3)*.26,y:.48+Math.floor(i/3)*.1},target:null,rest:0,speed:28+Math.random()*10}));this.creatures.forEach(c=>{c.target=this.target();c.rest=Math.random();});this.resize=new ResizeObserver(entries=>{this.width=entries[0].contentRect.width;this.height=entries[0].contentRect.height;});this.resize.observe(world);this.frame=requestAnimationFrame(t=>this.tick(t));}
 target(){return{x:.17+Math.random()*.66,y:.48+Math.random()*.27};}
 tick(time){if(this.stopped)return;const dt=this.last?Math.min((time-this.last)/1000,.05):0;this.last=time;if(!document.hidden)for(const c of this.creatures){c.rest-=dt;if(c.rest<=0){const old=c.position;c.position=walkToward(c.position,c.target,c.speed,dt,this.width,this.height);c.node.classList.toggle('walking',!c.position.arrived);c.node.style.setProperty('--facing',c.position.x<old.x?'-1':'1');if(c.position.arrived){c.rest=c.active?20:2+Math.random()*3;if(!c.active)c.target=this.target();c.node.classList.remove('walking');}}c.node.style.left=c.position.x*100+'%';c.node.style.top=c.position.y*100+'%';c.node.style.zIndex=c.active?'90':String(Math.round(c.position.y*100));c.node.style.setProperty('--depth','1');}this.frame=requestAnimationFrame(t=>this.tick(t));}
 wait(ms){return new Promise(resolve=>{if(this.stopped)return resolve(false);const id=setTimeout(()=>{this.timers.delete(id);resolve(!this.stopped);},ms);this.timers.set(id,resolve);});}
 async activity(id,kind){if(this.busy||this.stopped)return;const c=this.creatures.find(x=>x.id===id);if(!c)return;this.busy=true;c.active=true;const prop=this.world.querySelector('#park-prop');this.world.dataset.activity=kind;this.onActivity(c.name+' is coming over…',c.index,'walk');
 c.target={x:kind==='train'?.38:.5,y:.65};c.rest=0;c.speed=150;
 // Wait for arrival rather than running the action while the monster is still walking.
 for(let i=0;i<25;i++){if(Math.hypot(c.position.x-c.target.x,c.position.y-c.target.y)<.025)break;if(!await this.wait(80))return;}
 c.rest=20;c.node.classList.remove('walking');
 if(kind==='feed'){
  prop.innerHTML='<img src="preview/assets/snack.png" alt="Bowl of snacks">';prop.className='park-prop snack-prop';c.node.classList.add('eating');this.onActivity(c.name+' is eating. Crunch, crunch!',c.index,'eat');
  if(!await this.wait(1700))return;prop.classList.add('finished-snack');c.node.classList.remove('eating');c.node.classList.add('satisfied');this.onActivity(c.name+' enjoyed that snack!',c.index,'happy');
 }else if(kind==='pet'){
  c.node.classList.add('being-petted');this.onActivity(c.name+' leans in for a little love.',c.index,'pet');if(!await this.wait(1700))return;c.node.classList.remove('being-petted');c.node.classList.add('satisfied');this.onActivity(c.name+' feels loved!',c.index,'happy');
 }else{
  prop.innerHTML='<img class="practice-dummy" src="preview/assets/dummy.png" alt="Practice dummy">';prop.className='park-prop training-prop';this.onActivity(c.name+' is ready. '+c.specialMove+'!',c.index,'ready');if(!await this.wait(550))return;c.node.classList.add('training');prop.insertAdjacentHTML('beforeend',`<img class="park-move move-${c.type}" src="preview/assets/${moveArt(c.type)}.png" alt="${c.specialMove}">`);if(!await this.wait(420))return;prop.classList.add('dummy-hit');this.onActivity('Great move, '+c.name+'!',c.index,'strike');if(!await this.wait(650))return;c.node.classList.remove('training');c.node.classList.add('satisfied');
 }
 if(!await this.wait(850))return;c.node.classList.remove('satisfied');prop.innerHTML='';prop.className='park-prop';c.active=false;c.rest=1;c.speed=32;c.target=this.target();this.busy=false;delete this.world.dataset.activity;
 }
 destroy(){this.stopped=true;cancelAnimationFrame(this.frame);this.resize.disconnect();for(const[id,resolve]of this.timers){clearTimeout(id);resolve(false);}this.timers.clear();this.busy=false;}
}
