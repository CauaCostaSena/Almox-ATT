import { citiesByState } from './municipios.ts';
export { citiesByState };
// País, UF e município são validados por lista; bairro é informado pelo usuário.
export const countries = [{ code: "BR", name: "Brasil" }];
export const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export function locationInput(b: Record<string, unknown>) {
  const pais = String(b.pais ?? ""),
    estado = String(b.estado ?? "");
  if (pais !== "BR")
    throw Error(
      "Selecione Brasil como país. O cadastro atende funcionários no Brasil.",
    );
  if (!states.includes(estado))
    throw Error("Selecione um estado brasileiro válido.");
  return {pais,estado};
}
export function addressInput(b: Record<string, unknown>, legacy = false) {
  const {pais,estado}=locationInput(b);
  const cidade=String(b.cidade ?? '').trim(), bairro=String(b.bairro ?? '').trim().replace(/\s+/g,' ');
  if(legacy && !cidade && !bairro)return {pais,estado,cidade:null,bairro:null};
  if(!(citiesByState[estado] ?? []).includes(cidade))throw Error('Selecione uma cidade válida do estado informado.');
  if(bairro.length<2 || bairro.length>100 || !/^[\p{L}\p{N}][\p{L}\p{N} .,'’ºª\/-]*$/u.test(bairro))throw Error('Bairro: informe de 2 a 100 caracteres, sem símbolos inválidos.');
  return { pais, estado, cidade, bairro };
}
