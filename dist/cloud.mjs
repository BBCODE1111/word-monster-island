export class CloudError extends Error{constructor(message,status){super(message);this.status=status;}}
export class RangerCloud{
 constructor(config){this.url=config.apiUrl;this.session=null;this.version=null;try{this.session=JSON.parse(localStorage.getItem('wordling-session-v2'));}catch{}}
 saveSession(result){this.session={token:result.token,refreshToken:result.refreshToken,expiresAt:result.expiresAt};try{localStorage.setItem('wordling-session-v2',JSON.stringify(this.session));}catch{}}
 async request(path,body,{retry=true}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let response;
  try{response=await fetch(`${this.url}/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(this.session?.token?{'x-ranger-token':this.session.token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});}catch{throw new CloudError('Could not reach the cloud. Check your connection and try again.',0);}finally{clearTimeout(timer);}
  const data=await response.json().catch(()=>({error:'The server returned an unreadable reply.'}));
  if(response.status===401&&retry&&this.session?.refreshToken&&!['login','register','recover','refresh'].includes(path)){
   this.refreshing??=this.request('refresh',{refreshToken:this.session.refreshToken},{retry:false}).then(r=>this.saveSession(r)).finally(()=>{this.refreshing=null;});await this.refreshing;return this.request(path,body,{retry:false});
  }
  if(!response.ok)throw new CloudError(data.error||'Please try again.',response.status);return data;
 }
 async auth(mode,alias,password){const result=await this.request(mode,{alias,password});this.saveSession(result);this.version=result.version;return result;}
 async me(){const result=await this.request('me');this.version=result.version;return result;}
 async action(action){const result=await this.request('action',{action,version:this.version});this.version=result.version;return result.state;}
 async logout(){try{if(this.session)await this.request('logout',{});}finally{this.session=null;this.version=null;try{localStorage.removeItem('wordling-session-v2');}catch{}}}
 leaderboard(){return this.request('leaderboard');}
}
