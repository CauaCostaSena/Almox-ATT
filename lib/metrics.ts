type Row=Record<string,any>;
type Rank={id:string;nome:string;quantidade:number;valor:number};
export const monthToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date()).filter(p=>['year','month'].includes(p.type)).sort((a,b)=>a.type==='year'?-1:1).map(p=>p.value).join('-');
function snapshot(v:unknown):Row {
 try{return typeof v==='string' ? JSON.parse(v) : (v as Row) ?? {};}catch{return {};}
}
function dayOf(value:string) {
 const iso=value.includes('T') ? value : value.replace(' ','T');
 const date=new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso+'Z');
 if(!Number.isFinite(date.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');
}
export function buildMetrics(products:Row[],events:Row[],month=monthToday()) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Selecione um mês válido.');
 const [year,m]=month.split('-').map(Number), length=new Date(Date.UTC(year,m,0)).getUTCDate();
 const daily=Array.from({length},(_,i)=>({dia:i+1,receita:0,recebido:0,saidas:0,entradas:0}));
 const sold=new Map<string,Rank>(), received=new Map<string,Rank>();
 let receita=0,recebido=0,unidadesVendidas=0,unidadesRecebidas=0;
 for(const e of events) {
  const date=dayOf(String(e.criado_em ?? ''));
  if(date.slice(0,7)!==month || !['saida','entrada','cadastro'].includes(e.acao))continue;
  const before=snapshot(e.antes), after=snapshot(e.depois), out=e.acao==='saida';
  const quantity=Number(e.quantidade ?? (e.acao==='cadastro' ? after.quantidade : 0));
  const cents=Math.round(Number((out?before.preco:after.preco) ?? before.preco ?? after.preco ?? 0)*100);
  if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(cents))continue;
  const amount=cents*quantity, d=daily[Number(date.slice(8,10))-1];
  if(!d)continue;
  const target=out?sold:received, id=String(e.alvo_ref ?? e.alvo_id ?? 'legado:'+e.alvo_nome);
  const item=target.get(id) ?? {id,nome:e.alvo_nome,quantidade:0,valor:0};
  // O histórico chega do mais recente para o mais antigo; preserva o nome mais recente do período.
  item.quantidade+=quantity;item.valor+=amount;target.set(id,item);
  if(out){receita+=amount;unidadesVendidas+=quantity;d.receita+=amount;d.saidas+=quantity;}
  else {recebido+=amount;unidadesRecebidas+=quantity;d.recebido+=amount;d.entradas+=quantity;}
 }
 const ranks=(map:Map<string,Rank>)=>[...map.values()].map(r=>({...r,valor:r.valor/100})).sort((a,b)=>b.quantidade-a.quantidade||b.valor-a.valor||a.nome.localeCompare(b.nome));
 const inventory=products.map(p=>({id:String(p.id),nome:p.nome,quantidade:Number(p.quantidade),valor:Math.round(Number(p.preco)*100)*Number(p.quantidade)/100})).sort((a,b)=>b.valor-a.valor);
 return {receita:receita/100,recebido:recebido/100,unidadesVendidas,unidadesRecebidas,daily:daily.map(d=>({...d,receita:d.receita/100,recebido:d.recebido/100})),sold:ranks(sold),received:ranks(received),inventory,valorEstoque:inventory.reduce((s,p)=>s+Math.round(p.valor*100),0)/100};
}
