// Bundled with the shared rules and public course data by build.mjs.
const API_VERSION='2.0.0';
const allowedOrigins=new Set(['https://bbcode1111.github.io','http://localhost:4187','http://127.0.0.1:4187']);
const db=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const sha=async(text)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const recoveryCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const aliasEmail=alias=>`${alias}@players.wordling.invalid`;
function credentials(body){const alias=String(body.alias||'').toLowerCase().trim(),password=body.password;if(!/^[a-z0-9_-]{3,16}$/.test(alias))throw new ApiError('Player code: use 3–16 letters, numbers, _ or -.');if(typeof password!=='string'||password.length<8||password.length>64)throw new ApiError('Password: use 8–64 characters.');return {alias,password};}
async function limited(client,scope,max=20,seconds=900){const {data,error}=await client.rpc('ranger_consume_limit',{p_scope:scope,p_max:max,p_seconds:seconds});if(error)throw new ApiError('The database is getting ready. Please try again.',503);if(!data)throw new ApiError('Too many tries. Please take a break and try later.',429);}
function sessionBody(session){return {token:session.access_token,refreshToken:session.refresh_token,expiresAt:session.expires_at};}
async function playerRow(client,id){const {data,error}=await client.from('ranger_players').select('*').eq('id',id).maybeSingle();if(error)throw new ApiError('Cloud save is temporarily unavailable.',503);if(!data)throw new ApiError('Your player record could not be found. Please sign in again.',401);return data;}
Deno.serve(async(req)=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin&&allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'content-type,x-ranger-token','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowedOrigins.has(origin))return reply({error:'This game address is not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(!['GET','POST'].includes(req.method))throw new ApiError('Method not allowed.',405);
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(route==='health')return reply({ok:true,version:API_VERSION,build:RANGER_BUILD,species:RANGER_CATALOG.length,words:RANGER_DATA.summary.unique_word_count});
  const client=db();const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const ipHash=await sha(`${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}:${ip}`);
  if(route==='leaderboard'){
   await limited(client,`board:${ipHash}`,120,60);
   const {data,error,count}=await client.from('ranger_players').select('alias,caught,unique_species,rarity_points,rarity_counts,missions',{count:'exact'}).order('rarity_points',{ascending:false}).order('unique_species',{ascending:false}).order('caught',{ascending:false}).order('alias',{ascending:true}).limit(100);
   if(error)throw new ApiError('Leaderboard is resting. Please try again.',503);return reply({players:count,rows:data});
  }
  if(req.method!=='POST'&&route!=='me')throw new ApiError('Use POST for this action.',405);
  let body={};if(req.method==='POST'){const raw=await req.text();if(raw.length>16000)throw new ApiError('That request is too large.',413);try{body=JSON.parse(raw);}catch{throw new ApiError('Invalid request.');}}
  if(['register','login','recover'].includes(route)){
   const {alias,password}=credentials(body);await limited(client,`auth-ip:${ipHash}`,40);await limited(client,`auth-alias:${await sha(alias)}`,20);
   if(route==='register'){
    await limited(client,`signup:${ipHash}`,8,3600);
    const {data:created,error}=await client.auth.admin.createUser({email:aliasEmail(alias),password,email_confirm:true});if(error||!created.user)throw new ApiError('That player code is unavailable. Try another code.');
    const code=recoveryCode();const {error:saveError}=await client.from('ranger_players').insert({id:created.user.id,alias,recovery_hash:await sha(code)});
    if(saveError)throw new ApiError('Account setup could not finish. Please try again later.',503);
    const {data:signed,error:signError}=await db().auth.signInWithPassword({email:aliasEmail(alias),password});if(signError||!signed.session)throw new ApiError('Account created. Please sign in.',503);
    return reply({...sessionBody(signed.session),alias,state:{profile:null,mission:null},version:0,recoveryCode:code});
   }
   if(route==='recover'){
    const code=String(body.recoveryCode||'').replace(/\s/g,'').toLowerCase();if(!/^[0-9a-f]{32}$/.test(code))throw new ApiError('Player code or recovery code is incorrect.',401);
    const {data:row}=await client.from('ranger_players').select('id,recovery_hash').eq('alias',alias).maybeSingle();if(!row||row.recovery_hash!==await sha(code))throw new ApiError('Player code or recovery code is incorrect.',401);
    // Consuming the recovery hash uses a compare-and-swap so a code cannot be used twice.
    const nextCode=recoveryCode();const {data:changed,error:changeError}=await client.from('ranger_players').update({recovery_hash:await sha(nextCode)}).eq('id',row.id).eq('recovery_hash',row.recovery_hash).select('id');if(changeError||!changed?.length)throw new ApiError('Recovery code has already been used.',409);
    const {error:updateError}=await client.auth.admin.updateUserById(row.id,{password});if(updateError)throw new ApiError('Password could not be updated. Please contact the game owner.',503);
    return reply({ok:true,recoveryCode:nextCode});
   }
   const {data:signed,error}=await db().auth.signInWithPassword({email:aliasEmail(alias),password});if(error||!signed.session)throw new ApiError('Player code or password is incorrect.',401);
   const row=await playerRow(client,signed.user.id);return reply({...sessionBody(signed.session),alias:row.alias,state:row.state,version:row.version});
  }
  if(route==='refresh'){
   await limited(client,`refresh:${ipHash}`,100,60);if(typeof body.refreshToken!=='string'||body.refreshToken.length>2048)throw new ApiError('Please sign in again.',401);
   const {data,error}=await db().auth.refreshSession({refresh_token:body.refreshToken});if(error||!data.session)throw new ApiError('Please sign in again.',401);return reply(sessionBody(data.session));
  }
  const token=req.headers.get('x-ranger-token');if(!token||token.length>4096)throw new ApiError('Please sign in to continue.',401);
  const {data:verified,error:authError}=await client.auth.getUser(token);if(authError||!verified.user)throw new ApiError('Please sign in again.',401);
  if(route==='logout'){await client.auth.admin.signOut(token,'local');return reply({ok:true});}
  const row=await playerRow(client,verified.user.id);if(route==='me')return reply({alias:row.alias,state:row.state,version:row.version});
  if(route!=='action')throw new ApiError('Unknown game action.',404);
  await limited(client,`play:${verified.user.id}`,100,60);
  if(body.version!==row.version)throw new ApiError('Your save changed in another tab. Reload to continue.',409);
  if(body.action?.type==='answer'&&row.state.mission?.question?.issuedAt>Date.now()-600)throw new ApiError('Listen to the word before answering.');
  let next;try{next=reduceGame(row.state,body.action,RANGER_DATA,RANGER_CATALOG);}catch(error){throw new ApiError(error.message);}
  const summary=next.profile?rosterSummary(next.profile,RANGER_CATALOG):{caught:0,unique:0,rarityPoints:0,rarities:{},missions:0};
  const {data:saved,error:saveError}=await client.from('ranger_players').update({state:next,version:row.version+1,caught:summary.caught,unique_species:summary.unique,rarity_points:summary.rarityPoints,rarity_counts:summary.rarities,missions:summary.missions,updated_at:new Date().toISOString()}).eq('id',row.id).eq('version',row.version).select('version');
  if(saveError)throw new ApiError('Cloud save failed. Your last save is safe. Please retry.',503);if(!saved?.length)throw new ApiError('Your save changed in another tab. Reload to continue.',409);
  return reply({state:next,version:saved[0].version});
 }catch(error){return reply({error:error instanceof ApiError?error.message:'The game server is taking a break. Please try again.'},error instanceof ApiError?error.status:500);}
});
