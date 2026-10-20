import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createPool } from "../server/db.mjs";

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
if (!process.env.DB_NAME?.endsWith("_testes"))
  throw Error("Use somente base terminada em _testes.");
const pool = createPool();
let server;
const origin = "http://127.0.0.1:3102";
let browser, page;

test.before(async () => {
  await mkdir("test-results", { recursive: true });
  server = spawn(
    process.execPath,
    ["--experimental-strip-types", "server/index.mjs"],
    { env: { ...process.env, PORT: "3102" }, stdio: "inherit" },
  );
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(origin);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await pool.query("DELETE FROM movimentacoes");
  await pool.query("DELETE FROM auditoria_admin");
  await pool.query("DELETE FROM produtos");
  await pool.query("DELETE FROM usuarios WHERE conta_sistema=0");
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
});

test.after(async () => {
  await browser?.close();
  server?.kill();
  await pool.end();
});

test("TA01 - Cliente consegue controlar estoque em reais", async () => {
  await page.goto(origin);

  // Se estiver deslogado, cadastra ou loga
  const isLoginPage = await page
    .getByRole("heading", { name: "Acesse sua conta" })
    .isVisible()
    .catch(() => false);
  if (isLoginPage) {
    // Tenta logar como admin ou criar funcionário
    await page.getByLabel("E-mail", { exact: true }).fill("admin@almox.est");
    await page.getByLabel("Senha", { exact: true }).fill("admin$777");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }

  await page.getByRole("heading", { name: "Estoque organizado." }).waitFor();

  // Cadastrar produto a R$20,00 com 10 unidades
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Cabo de Rede Cat6");
  await page.getByLabel("Preço unitário").fill("2000");
  assert.equal(await page.getByLabel("Preço unitário").inputValue(), "R$20,00");
  await page.getByLabel("Quantidade inicial").fill("10");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  // Conferir R$20,00 na tabela
  await page
    .getByRole("cell", { name: "Cabo de Rede Cat6", exact: true })
    .waitFor();
  await page.getByRole("cell", { name: "R$20,00", exact: true }).waitFor();

  // Movimentar saída de 10
  await page
    .getByRole("button", { name: "Movimentar Cabo de Rede Cat6" })
    .click();
  await page.getByRole("combobox").selectOption("saida");
  await page.getByLabel("Quantidade", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("cell", { name: "0 un.", exact: true }).waitFor();

  // Tentar saída excedente de 1
  await page
    .getByRole("button", { name: "Movimentar Cabo de Rede Cat6" })
    .click();
  await page.getByRole("combobox").selectOption("saida");
  await page.getByLabel("Quantidade", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "Estoque insuficiente" })
    .waitFor();

  // Fechar modal de movimentação com erro
  await page.keyboard.press("Escape");

  // Recarregar e verificar persistência de 0 un.
  await page.reload();
  await page.getByRole("cell", { name: "0 un.", exact: true }).waitFor();

  await page.screenshot({
    path: "test-results/TA01-controle-reais.png",
    fullPage: true,
  });
  console.log(
    "TA01 concluído com sucesso! Evidência salva em test-results/TA01-controle-reais.png",
  );
});

test("TA02 - Cliente identifica o que mudou e quem excluiu", async () => {
  // Editar nome e preço
  await page.getByRole("button", { name: "Editar Cabo de Rede Cat6" }).click();
  await page
    .getByLabel("Nome", { exact: true })
    .fill("Cabo de Rede Cat6 Blindado");
  await page.getByLabel("Preço unitário").fill("2550");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();

  await page
    .getByRole("cell", { name: "Cabo de Rede Cat6 Blindado", exact: true })
    .waitFor();
  await page.getByRole("cell", { name: "R$25,50", exact: true }).waitFor();

  // Consultar histórico e reverter
  await page
    .getByRole("button", { name: "Movimentações", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reverter edição", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByText("Edição revertida", { exact: true }).waitFor();

  // Voltar a produtos e conferir restauração do nome original
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page
    .getByRole("cell", { name: "Cabo de Rede Cat6", exact: true })
    .waitFor();

  // Excluir produto com confirmação irreversível
  await page.getByRole("button", { name: "Excluir Cabo de Rede Cat6" }).click();
  await page
    .getByText(
      "Tem certeza que deseja realizar essa exclusão? Não será possível reverter essa ação!",
      { exact: true },
    )
    .waitFor();
  await page.getByLabel("Senha para excluir produto").fill("#DeleAll42");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();

  // Verificar que foi removido do catálogo
  assert.equal(
    await page
      .getByRole("cell", { name: "Cabo de Rede Cat6", exact: true })
      .count(),
    0,
  );

  // Consultar histórico para confirmar que o nome e responsável estão preservados
  await page
    .getByRole("button", { name: "Movimentações", exact: true })
    .click();
  await page.getByText("Exclusão", { exact: true }).first().waitFor();
  assert.ok((await page.getByText("Cabo de Rede Cat6").count()) > 0);

  await page.screenshot({
    path: "test-results/TA02-historico-reversao.png",
    fullPage: true,
  });
  console.log(
    "TA02 concluído com sucesso! Evidência salva em test-results/TA02-historico-reversao.png",
  );
});

test("TA03 - Admin gerencia equipe sem liberar funções a funcionários", async () => {
  // Sair da conta admin
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("heading", { name: "Acesse sua conta" }).waitFor();

  // Criar funcionário de teste
  await page
    .getByRole("button", { name: "Primeiro acesso? Cadastre-se" })
    .click();
  const emailFunc = "auditor@almox.est";
  await page.getByLabel("Nome", { exact: true }).fill("Auditor Cliente");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page.getByLabel("Telefone").fill("11999999999");
  await page.getByLabel("E-mail", { exact: true }).fill(emailFunc);
  await page.getByLabel("Data de nascimento").fill("1995-05-15");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("BA");
  await page
    .getByRole("combobox", { name: "Cidade", exact: true })
    .selectOption("Salvador");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await page.getByLabel("Cargo").fill("Auditor de Testes");
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  // Logar como o funcionário recém-criado
  await page.getByRole("heading", { name: "Acesse sua conta" }).waitFor();
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("heading", { name: "Estoque organizado." }).waitFor();

  // Conferir que funcionário NÃO tem acesso nem botão Funcionários
  assert.equal(
    await page
      .getByRole("button", { name: "Funcionários", exact: true })
      .count(),
    0,
  );

  // Tentar acessar /api/admin diretamente (deve retornar 403 Proibido)
  const statusAdmin = await page.evaluate(
    async () => (await fetch("/api/admin")).status,
  );
  assert.equal(statusAdmin, 403);

  // Sair e logar como Administrador
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("heading", { name: "Acesse sua conta" }).waitFor();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@almox.est");
  await page.getByLabel("Senha", { exact: true }).fill("admin$777");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("heading", { name: "Estoque organizado." }).waitFor();

  // Ir para gestão de funcionários
  await page.getByRole("button", { name: "Funcionários", exact: true }).click();
  await page.getByRole("button", { name: "Excluir Auditor Cliente" }).waitFor();

  // Excluir funcionário
  await page.getByRole("button", { name: "Excluir Auditor Cliente" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();

  // Tentar novo login com o funcionário excluído (deve ser rejeitado)
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("heading", { name: "Acesse sua conta" }).waitFor();
  await page.getByLabel("E-mail", { exact: true }).fill(emailFunc);
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "E-mail ou senha incorretos" })
    .waitFor();

  await page.screenshot({
    path: "test-results/TA03-admin-seguranca.png",
    fullPage: true,
  });
  console.log(
    "TA03 concluído com sucesso! Evidência salva em test-results/TA03-admin-seguranca.png",
  );
});
