export const MONSTER_MOVES=['LEAF DASH','VOLT POUNCE','WING STRIKE','EMBER RUSH','TIDAL PUNCH','STORM BURST'];
export const moveArt=type=>({LEAF:'leaves',VOLT:'lightning',STORM:'lightning',WATER:'wave',FIRE:'fire',FROST:'ice',WIND:'leaves',SHADE:'ice',METAL:'ice',STONE:'ice',LIGHT:'lightning'}[type]||'leaves');
export class BattleAction{
 constructor(arena,audio,speaker){this.arena=arena;this.audio=audio;this.speaker=speaker;this.timers=new Map();this.stopped=false;this.hero=arena.querySelector('.hero-actor');this.enemy=arena.querySelector('.enemy-wrap');this.caption=arena.querySelector('.action-caption');}
 wait(ms){return new Promise(resolve=>{if(this.stopped)return resolve(false);const id=setTimeout(()=>{this.timers.delete(id);resolve(!this.stopped);},ms);this.timers.set(id,resolve);});}
 label(text){if(this.stopped)return;this.caption.textContent=text;this.caption.classList.add('visible');}
 fx(markup){if(!this.stopped)this.arena.insertAdjacentHTML('beforeend',markup);}
 async play(kind,index,final=false,details={}){
  if(kind==='wrong'){
   this.arena.classList.add('retaliating');this.enemy.classList.add('counterattack');this.label('Watch out!');this.audio.effect('attack');
   if(!await this.wait(260))return;this.arena.classList.add('shield-impact');this.audio.impact('STONE');this.fx('<div class="hero-shield action-fx"></div>');this.label('−'+(details.counterDamage||0)+' HP · Listen and learn.');await this.wait(580);return;
  }
  const capture=kind==='capture'||kind==='miss',special=details.special&&!capture;
  this.arena.classList.add(capture?'capture-action':special?'special-action':'basic-action');this.arena.dataset.moveType=details.type||'LEAF';this.label(capture?'WORDLINK · CATCH!':details.move||'ATTACK!');this.audio.effect('attack');
  if(capture){this.fx('<div class="charge-orb action-fx"></div>');if(!await this.wait(220))return;this.fx('<div class="capture-beam action-fx"></div>');this.audio.effect('beam');}
  else if(special){this.fx(`<img class="special-projectile action-fx move-${details.type}" src="preview/assets/${moveArt(details.type)}.png" alt="">`);this.audio.move(details.type);}
  if(!await this.wait(capture?340:special?620:280))return;
  this.enemy.classList.add('impact-hit');this.arena.classList.add('contact-impact');this.audio.impact(details.type,special);this.fx('<div class="impact-burst action-fx"></div>');
  if(kind==='capture'){this.enemy.classList.add('captured');this.audio.effect('success');this.label('Caught! A new teammate!');}
  else if(kind==='miss'){this.label('Broke free. Try another word!');this.audio.effect('wrong');}
  else{this.fx('<div class="damage-number action-fx">−'+(details.damage||0)+'</div>');this.label(special?'SPECIAL HIT!':'DIRECT HIT!');}
  if(!await this.wait(special?600:420))return;
  if(details.defeated){this.enemy.classList.add('retreating');this.label(final?'Guardian cleared! An egg is waiting…':'Great work!');this.audio.effect('success');await this.wait(400);}
 }
 clean(){this.arena.classList.remove('retaliating','shield-impact','link-attack','basic-action','special-action','capture-action','contact-impact');this.enemy.classList.remove('counterattack','impact-hit');this.arena.querySelectorAll('.action-fx').forEach(n=>n.remove());this.caption.classList.remove('visible');for(const[id,resolve]of this.timers){clearTimeout(id);resolve(false);}this.timers.clear();}
 cancel(){this.stopped=true;this.clean();}
}
