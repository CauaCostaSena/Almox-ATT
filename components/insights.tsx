import {useMemo,useState} from 'react';
import {TrendingUp,Package,ArrowDownToLine,ShoppingBag,CalendarDays} from 'lucide-react';
import {buildMetrics,monthToday} from '../lib/metrics';
type Row=Record<string,any>;
const cash=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function Curve({days,mode}:{days:Row[];mode:'receita'|'recebido'}) {
 const max=(Math.max(0,...days.map(d=>d[mode])) || 1), width=760,height=220;
 const point=(d:Row,i:number)=>`${28+i*(width-56)/Math.max(days.length-1,1)},${height-35-(d[mode]/max)*(height-65)}`;
 const points=days.map(point).join(' '), id='gradient-'+mode;
 return <div className="chart-scroll"><svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={mode==='receita'?'Receita por dia do mês':'Valor recebido por dia do mês'}>
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b8d7c" stopOpacity=".3"/><stop offset="100%" stopColor="#4b8d7c" stopOpacity="0"/></linearGradient></defs>
  {[0,.5,1].map(n=><g key={n}><line x1="28" x2="732" y1={height-35-n*(height-65)} y2={height-35-n*(height-65)} stroke="#e8eef0" strokeDasharray="4 5"/></g>)}
  <polygon points={`28,${height-35} ${points} 732,${height-35}`} fill={`url(#${id})`}/><polyline points={points} fill="none" stroke="#2f7c69" strokeWidth="3" strokeLinejoin="round"/>
  {days.map((d,i)=><g key={d.dia}><circle cx={28+i*(width-56)/Math.max(days.length-1,1)} cy={height-35-(d[mode]/max)*(height-65)} r={d[mode]?4:2} fill="#2f7c69"><title>{`Dia ${d.dia}: ${cash(d[mode])}`}</title></circle>{(i%5===0||i===days.length-1)&&<text x={28+i*(width-56)/Math.max(days.length-1,1)} y={height-10} textAnchor="middle" fill="#6d818c" fontSize="11">{d.dia}</text>}</g>)}
 </svg><div className="chart-scale"><span>R$ 0</span><span>Maior dia {cash(max===1 && !days.some(d=>d[mode])?0:max)}</span></div></div>;
}
function Ranking({rows,byValue=false}:{rows:Row[];byValue?:boolean}) {
 const top=rows.slice(0,6),max=Math.max(1,...top.map(p=>byValue?p.valor:p.quantidade));
 return top.length?<ol className="ranking">{top.map((p,i)=><li key={p.id}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><div className="rank-detail"><div><b>{p.nome}</b><span>{byValue?cash(p.valor):`${p.quantidade} un.`}</span></div><div className="rank-track"><i style={{width:`${(byValue?p.valor:p.quantidade)/max*100}%`}}/></div><small>{byValue?`${p.quantidade} unidades disponíveis`:cash(p.valor)}</small></div></li>)}</ol>:<div className="insight-empty">Os resultados aparecerão após as primeiras movimentações.</div>;
}
export function Insights({products,events}:{products:Row[];events:Row[]}) {
 const [month,setMonth]=useState(monthToday),[view,setView]=useState<'sales'|'stock'>('sales');
 const stats=useMemo(()=>buildMetrics(products,events,month),[products,events,month]);
 const sold=view==='sales',activeDays=stats.daily.filter(d=>sold?d.saidas:d.entradas).length;
 return <section className="insights" aria-label="Análise do estoque e das saídas">
  <div className="insight-heading"><div><span className="eyebrow">RESULTADOS DO ALMOX</span><h2>Seu estoque em perspectiva</h2><p>Saídas, entradas e produtos que movimentam o mês.</p></div><label className="month-picker"><CalendarDays size={18}/><span>Mês</span><input aria-label="Mês da análise" type="month" min="2000-01" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value)}}/></label></div>
  <div className="insight-switch" aria-label="Análise"><button className={sold?'selected':''} onClick={()=>setView('sales')}><TrendingUp size={17}/> Vendas e receita</button><button className={!sold?'selected':''} onClick={()=>setView('stock')}><Package size={17}/> Estoque e entradas</button></div>
  <p className="metric-note">{sold?'Saídas consideradas vendas, pelo preço registrado na movimentação. Receita bruta; custos e lucro não são calculados.':'O valor disponível reflete o estoque atual. Entradas e cadastros iniciais seguem o mês selecionado.'}</p>
  <div className="insight-kpis">{(sold?[
   ['Receita de saídas',cash(stats.receita),TrendingUp],['Unidades vendidas',stats.unidadesVendidas,ShoppingBag],['Produtos com saída',stats.sold.length,Package],['Dias com vendas',activeDays,CalendarDays]
  ]:[['Valor disponível hoje',cash(stats.valorEstoque),Package],['Valor recebido no mês',cash(stats.recebido),ArrowDownToLine],['Unidades recebidas',stats.unidadesRecebidas,ShoppingBag],['Dias com entradas',activeDays,CalendarDays]]).map(([label,value,Icon]:any)=><article className="insight-kpi" key={label}><Icon size={19}/><span>{label}</span><strong>{value}</strong></article>)}</div>
  <div className="insight-grid" key={view}><article className="insight-card"><header><div><h3>{sold?'Receita ao longo do mês':'Entradas ao longo do mês'}</h3><p>Valores em reais por dia • horário de Brasília</p></div><span className="chart-chip">{cash(sold?stats.receita:stats.recebido)}</span></header><Curve days={stats.daily} mode={sold?'receita':'recebido'}/><details className="chart-data"><summary>Consultar valores por dia</summary><div className="table-wrap"><table><thead><tr><th>Dia</th><th>Unidades</th><th>Valor</th></tr></thead><tbody>{stats.daily.map(d=><tr key={d.dia}><td>{d.dia}</td><td>{sold?d.saidas:d.entradas}</td><td>{cash(sold?d.receita:d.recebido)}</td></tr>)}</tbody></table></div></details></article>
   <article className="insight-card"><header><div><h3>{sold?'Mais vendidos':'Mais recebidos'}</h3><p>Até seis produtos • por unidades no mês</p></div></header><Ranking rows={sold?stats.sold:stats.received}/></article>
   {!sold&&<article className="insight-card inventory-card"><header><div><h3>Onde está o valor do estoque</h3><p>Produtos disponíveis, ordenados pelo valor atual</p></div><span className="chart-chip">{products.length} produtos</span></header><Ranking rows={stats.inventory} byValue/></article>}
  </div>
 </section>;
}
