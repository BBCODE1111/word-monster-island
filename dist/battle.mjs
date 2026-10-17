export const MONSTER_MOVES=['芽葉旋風','星雲波波','蜜羽閃光','櫻花飛舞','泡泡衝擊','星花守護波'];
// Every timer and voice belongs to this encounter, so leaving or pausing cancels it.
export class BattleAction{
 constructor(arena,audio,speaker){this.arena=arena;this.audio=audio;this.speaker=speaker;this.timers=new Map();this.stopped=false;this.hero=arena.querySelector('.hero-actor');this.enemy=arena.querySelector('.enemy-wrap');this.caption=arena.querySelector('.action-caption');}
 wait(ms){return new Promise(resolve=>{if(this.stopped)return resolve(false);const id=setTimeout(()=>{this.timers.delete(id);resolve(!this.stopped);},ms);this.timers.set(id,resolve);});}
 async voice(key){if(this.stopped)return;let end;const done=new Promise(r=>{end=r;});this.voiceEnd=end;this.speaker.play(key,{onend:end,onerror:end}).catch(end);await Promise.race([done,this.wait(9000)]);if(this.voiceEnd===end)this.voiceEnd=null;}
 label(text){if(this.stopped)return;this.caption.textContent=text;this.caption.classList.add('visible');}
 fx(markup){if(!this.stopped)this.arena.insertAdjacentHTML('beforeend',markup);}
 pose(name){this.hero.classList.remove('casting','hurt','celebrating');if(name)this.hero.classList.add(name);}
 async play(kind,index,final=false){
  if(kind==='wrong'){
   this.arena.classList.add('retaliating');this.enemy.classList.add('counterattack');this.label(MONSTER_MOVES[index]+'！');this.audio.cry(index);this.audio.effect('wrong');this.fx('<div class="enemy-projectile action-fx"></div>');
   if(!await this.wait(440))return;this.pose('hurt');this.arena.classList.add('shield-impact');this.audio.effect('impact');this.fx('<div class="hero-shield action-fx"></div><div class="battle-float action-fx">護盾擋住了！</div>');
   this.label('護盾擋住了！再試一次，你可以的。');await this.voice('@hurt');if(!await this.wait(300))return;
  }else{
   this.arena.classList.add('link-attack');this.pose('casting');this.label('WORDLINK · 捕捉光束！');this.audio.effect('attack');const call=this.voice('@attack');this.fx('<div class="charge-orb action-fx"></div>');
   if(!await this.wait(420))return;this.fx('<div class="capture-beam action-fx"></div>');this.audio.effect('beam');
   if(!await this.wait(370))return;this.enemy.classList.add('impact-hit');this.audio.cry(index);this.fx('<div class="impact-burst action-fx"></div>');
   if(kind==='capture'){
    if(!await this.wait(300))return;this.fx('<div class="scan-ring action-fx"></div><div class="capture-light action-fx"></div>');this.enemy.classList.add('captured');this.audio.effect('success');
   }else{this.audio.effect('hit');this.fx('<div class="damage-number action-fx">−1 HP</div>');}
   await call;if(this.stopped)return;
   if(kind==='capture'){this.pose('celebrating');this.label('捕捉成功！新的夥伴加入了。');this.fx('<div class="friend-stars action-fx">✦ &nbsp; ✧ &nbsp; ✦</div>');await this.voice(final?'@victory':'@capture');}
   else{this.label('命中！守護者能量 −1');await this.voice('@hit');}
   if(!await this.wait(280))return;
  }
 }
 clean(){this.arena.classList.remove('retaliating','shield-impact','link-attack');this.enemy.classList.remove('counterattack','impact-hit');this.pose(null);this.arena.querySelectorAll('.action-fx').forEach(n=>n.remove());this.caption.classList.remove('visible');this.caption.textContent='';for(const [id,resolve]of this.timers){clearTimeout(id);resolve(false);}this.timers.clear();}
 cancel(){this.stopped=true;this.speaker.stop();this.voiceEnd?.();this.clean();}
}
