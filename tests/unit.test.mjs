import test from "node:test";
import assert from "node:assert/strict";
import { locationInput } from "../lib/locations.ts";
test("TU06 país e estado: lista fechada inclusive no servidor", () => {
  assert.deepEqual(locationInput({ pais: "BR", estado: "BA" }), {
    pais: "BR",
    estado: "BA",
  });
  for (const b of [
    { pais: "NEYMARLÂNDIA", estado: "BA" },
    { pais: "BR", estado: "XX" },
    { pais: "US", estado: "BA" },
    { pais: "BR", estado: "" },
    {},
  ])
    assert.throws(() => locationInput(b));
});
import {
  price,
  balance,
  quantity,
  employeeInput,
  ageAt,
  validCpf,
} from "../lib/rules.ts";
const employee = {
  nome: "João da Silva",
  cpf: "52998224725",
  telefone: "11999999999",
  email: "joao@almox.est",
  nascimento: "2010-10-09",
  cargo: "Estoquista",
  pais: "BR",
  estado: "BA",
  cidade: "Salvador",
  bairro: "Centro",
};
test("TU01 preço em reais: mínimo, zero e casas decimais", () => {
  assert.equal(price("R$20,00"), "20.00");
  assert.equal(price("0,01"), "0.01");
  for (const v of ["0", "-1", "20,001", "abc", "1000000.01"])
    assert.throws(() => price(v));
});
test("TU02 quantidade positiva, saída exata e excesso", () => {
  assert.equal(balance(10, "saida", 10), 0);
  assert.throws(() => balance(10, "saida", 11));
  assert.throws(() => quantity(0));
  assert.throws(() => quantity(1.5));
  assert.equal(quantity(0, true), 0);
});
test("TU03 idade no aniversário, CPF e cadastro inválido", () => {
  assert.equal(ageAt("2010-10-09", "2026-10-08"), 15);
  assert.equal(employeeInput(employee, "2026-10-09").idade, 16);
  assert.equal(ageAt("2000-02-29", "2025-02-28"), 24);
  assert.equal(ageAt("2000-02-29", "2025-03-01"), 25);
  assert.ok(validCpf(employee.cpf));
  for (const b of [
    { nome: "João2" },
    { nome: "João!" },
    { cpf: "1111111111" },
    { cpf: "529982247251" },
    { email: "joao@gmail.com" },
    { email: "joao@almox.est.evil" },
    { nascimento: "2010-10-10" },
    { nascimento: "2020-02-30" },
    { telefone: "123" },
  ])
    assert.throws(() => employeeInput({ ...employee, ...b }, "2026-10-09"));
});
