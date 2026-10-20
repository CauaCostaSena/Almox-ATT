export const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
export function formatCpf(value: unknown) {
  return digits(value).slice(0,11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
export function formatPhone(value: unknown) {
  const s=digits(value).slice(0,11);
  if(s.length<=2)return s ? `(${s}` : "";
  const number=s.slice(2), split=number.length>8 ? 5 : 4;
  return `(${s.slice(0,2)}) ${number.slice(0,split)}${number.length>split ? "-"+number.slice(split) : ""}`;
}
// Fonte Anatel: códigos nacionais por UF. DDD 61 atende DF e parte de GO.
export const stateDdds: Record<string,string[]> = {
 AC:["68"],AL:["82"],AP:["96"],AM:["92","97"],BA:["71","73","74","75","77"],CE:["85","88"],DF:["61"],ES:["27","28"],GO:["62","64","61"],MA:["98","99"],MT:["65","66"],MS:["67"],MG:["31","32","33","34","35","37","38"],PA:["91","93","94"],PB:["83"],PR:["41","42","43","44","45","46"],PE:["81","87"],PI:["86","89"],RJ:["21","22","24"],RN:["84"],RS:["51","53","54","55"],RO:["69"],RR:["95"],SC:["47","48","49"],SP:["11","12","13","14","15","16","17","18","19"],SE:["79"],TO:["63"]
};
export function suggestState(phone: unknown, current="") {
 const ddd=digits(phone).slice(0,2);
 const matches=Object.keys(stateDdds).filter(uf=>stateDdds[uf].includes(ddd));
 return matches.length===1 ? matches[0] : matches.includes(current) ? current : "";
}
export function suggestPhoneForState(phone: unknown, uf: string) {
 const s=digits(phone), options=stateDdds[uf] ?? [];
 if(!options.length || options.includes(s.slice(0,2)))return s;
 return options[0]+s.slice(2);
}
export function localToday() {
 const d=new Date();const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');
}
export function searchProducts<T extends {nome:string}>(products:T[],query:string) {
 const normalize=(s:string)=>s.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('pt-BR');
 return products.filter(p=>normalize(p.nome).includes(normalize(query)));
}
