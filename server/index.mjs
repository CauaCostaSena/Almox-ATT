import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createPool} from './db.mjs';
import {readStock,saveStock,readAdmin,saveAdmin,register,login,logout,sessionUser,updateAges,InputError} from './service.mjs';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const pool=createPool();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
async function body(req){let data='';for await(const part of req){data+=part;if(Buffer.byteLength(data)>16384)throw new InputError('Dados muito grandes.',413)}try{return JSON.parse(data)}catch{throw new InputError('JSON inválido.')}}
const attempts=new Map();
const ageTimer=setInterval(()=>updateAges(pool).catch(e=>console.error(e.message)),60000);ageTimer.unref();
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const token=String(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('almox_session='))?.slice(14);
   if(!['GET','POST'].includes(req.method))throw new InputError('Método não permitido.',405);
   if(req.method==='POST'){
    if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)throw new InputError('Origem não permitida.',403);
    if(!String(req.headers['content-type']).startsWith('application/json'))throw new InputError('Envie JSON.',415);
   }
   const data=req.method==='POST'?await body(req):null;
   if(url.pathname==='/api/login'&&data){
    const key=req.socket.remoteAddress;const previous=attempts.get(key);if(previous&&previous.until>Date.now()&&previous.count>=10)throw new InputError('Muitas tentativas. Aguarde 15 minutos.',429);
    try{const result=await login(pool,data);attempts.delete(key);res.setHeader('Set-Cookie',`almox_session=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);json(res,200,{ok:true});}catch(e){if(e.status===401){const p=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+900000};p.count++;attempts.set(key,p);}throw e;}return;
   }
   if(url.pathname==='/api/cadastro'&&data){json(res,201,await register(pool,data));return;}
   if(url.pathname==='/api/logout'&&data){await logout(pool,token);res.setHeader('Set-Cookie','almox_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');json(res,200,{ok:true});return;}
   const user=await sessionUser(pool,token);if(!user)throw new InputError('Entre na sua conta para continuar.',401);
   if(url.pathname==='/api/me'&&!data){json(res,200,{user});return;}
   if(url.pathname==='/api/estoque'){json(res,200,data?await saveStock(pool,data,user):await readStock(pool));return;}
   if(url.pathname==='/api/admin'){if(user.perfil!=='admin')throw new InputError('Acesso restrito ao administrador.',403);json(res,200,data?await saveAdmin(pool,data,user):await readAdmin(pool));return;}
   throw new InputError('Recurso não encontrado.',404);
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'Método não permitido.'});return;}
  const requestPath=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+requestPath);
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){json(res,403,{error:'Acesso negado.'});return;}
  try{const content=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content)}catch{json(res,404,{error:'Página não encontrada. Execute npm run build antes de iniciar.'})}
 }catch(e){if(e.code==='ER_DUP_ENTRY'){json(res,409,{error:'CPF ou e-mail já cadastrado. Não foi feita nenhuma alteração.'});return;}if(e instanceof InputError){json(res,e.status,{error:e.message});return;}console.error(e.code??'',e.message);json(res,503,{error:'Não foi possível acessar o banco. Confira o serviço MySQL e a configuração do servidor.'});}
});
const port=Number(process.env.PORT||3000);
server.listen(port,'127.0.0.1',()=>console.log(`Almox: http://localhost:${port} | Banco MySQL: ${process.env.DB_NAME}`));
async function close(){server.close();await pool.end()};process.on('SIGINT',close);process.on('SIGTERM',close);
