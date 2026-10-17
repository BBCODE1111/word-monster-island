// Optional GitHub Actions deployment. Credentials are read from environment only.
import {readFile} from 'node:fs/promises';
const ref='ijlwalmwzibbgnuolaww',token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw Error('Add SUPABASE_ACCESS_TOKEN as a repository Actions secret.');
async function api(path,body){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});if(!r.ok)throw Error(`Supabase deployment failed (${r.status}). Check the scoped token permissions. No credential values are logged.`);return r.json();}
await api('database/query',{query:await readFile(new URL('schema.sql',import.meta.url),'utf8')});
const form=new FormData();form.set('metadata',JSON.stringify({name:'wordling-api',entrypoint_path:'index.ts',verify_jwt:false}));form.set('file',new Blob([await readFile(new URL('index.ts',import.meta.url))],{type:'application/typescript'}),'index.ts');
await api('functions/deploy?slug=wordling-api',form);console.log('Supabase game API deployed.');
