import { addressInput } from "./locations.ts";
export function price(value: unknown): string {
  const s = String(value ?? "")
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s) || Number(s) <= 0 || Number(s) > 1000000)
    throw Error(
      "Informe um preço maior que zero, até R$1.000.000,00, com até duas casas decimais.",
    );
  return Number(s).toFixed(2);
}
export function quantity(v: unknown, zero = false): number {
  const s = String(v ?? "");
  const n = Number(s);
  if (
    !/^\d+$/.test(s) ||
    !Number.isSafeInteger(n) ||
    n < (zero ? 0 : 1) ||
    n > 1000000
  )
    throw Error(
      "Informe uma quantidade inteira " +
        (zero ? "de zero" : "positiva") +
        " até 1.000.000.",
    );
  return n;
}
export function balance(stock: number, type: string, q: number) {
  quantity(q);
  if (!["entrada", "saida"].includes(type))
    throw Error("Movimentação inválida.");
  const n = stock + (type === "entrada" ? q : -q);
  if (n < 0) throw Error("Estoque insuficiente.");
  if (n > 1000000) throw Error("Saldo máximo: 1.000.000.");
  return n;
}
export function productInput(b: Record<string, unknown>) {
  const nome = String(b.nome ?? "").trim();
  if (nome.length < 2 || nome.length > 100)
    throw Error("Nome do produto: de 2 a 100 caracteres.");
  return {
    nome,
    preco: price(b.preco),
    quantidade: quantity(b.quantidade ?? 0, true),
  };
}
export function ageAt(
  birth: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const [y, m, d] = birth.split("-").map(Number);
  const [a, b, c] = today.split("-").map(Number);
  return a - y - (b < m || (b === m && c < d) ? 1 : 0);
}
export function validCpf(s: string) {
  // A atividade permite CPF fictício: valida comprimento, não existência/dígitos verificadores.
  return /^\d{11}$/.test(s);
}
export function employeeInput(b: Record<string, unknown>, today?: string, legacySnapshot=false) {
  const nome = String(b.nome ?? "")
      .trim()
      .replace(/\s+/g, " "),
    cpf = String(b.cpf ?? "").replace(/[.\-]/g, ""),
    telefone = String(b.telefone ?? "").replace(/[() \-]/g, ""),
    email = String(b.email ?? "")
      .trim()
      .toLowerCase(),
    nascimento = String(b.nascimento ?? ""),
    cargo = String(b.cargo ?? "").trim();
  if (
    nome.length < 2 ||
    nome.length > 100 ||
    !/^\p{L}+(?: \p{L}+)*$/u.test(nome)
  )
    throw Error("Nome deve conter apenas letras e espaços.");
  if (!validCpf(cpf))
    throw Error("CPF: informe exatamente 11 números. CPFs fictícios são permitidos.");
  if (!/^\d{10,11}$/.test(telefone))
    throw Error("Telefone deve ter 10 ou 11 dígitos, incluindo DDD.");
  if (
    nascimento > (today ?? new Date().toISOString().slice(0,10))
  ) throw Error('A data de nascimento não pode estar no futuro.');
  if (
    !/^[a-z0-9]+(?:[._+-][a-z0-9]+)*@almox\.est$/.test(email) ||
    email.length > 150
  )
    throw Error("Utilize um e-mail com domínio @almox.est.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(nascimento) ||
    !Number.isFinite(Date.parse(nascimento)) ||
    new Date(nascimento + "T00:00:00Z").toISOString().slice(0, 10) !==
      nascimento ||
    ageAt(nascimento, today) < 16 ||
    ageAt(nascimento, today) > 120
  )
    throw Error("Informe uma data válida; idade permitida de 16 a 120 anos.");
  if (cargo.length < 2 || cargo.length > 80)
    throw Error("Cargo deve ter entre 2 e 80 caracteres.");
  return {
    nome,
    cpf,
    telefone,
    email,
    nascimento,
    cargo,
    idade: ageAt(nascimento, today),
    ...(legacySnapshot && b.pais==null && b.estado==null ? {pais:null,estado:null,cidade:null,bairro:null} : addressInput(b, legacySnapshot)),
  };
}
