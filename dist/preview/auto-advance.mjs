// A result belongs to one question. Pauses never consume its review time.
export class ReviewClock {
 constructor(){this.cancel();}
 reset(id,ms){this.id=id;this.remaining=ms;this.ready=false;this.held=false;this.consumed=false;}
 arm(id){if(id===this.id&&!this.consumed)this.ready=true;}
 hold(value){this.held=value;}
 cancel(){this.id=null;this.ready=false;this.held=false;this.consumed=false;this.remaining=0;}
 tick(ms,{active=true}={}){if(!active||!this.id||!this.ready||this.held||this.consumed)return false;this.remaining=Math.max(0,this.remaining-ms);if(this.remaining>0)return false;this.consumed=true;return true;}
}
