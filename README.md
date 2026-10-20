# Almox 3.2

Sistema web de estoque com React, TypeScript, Node.js e MySQL.

Esta revisão aplica as anotações dos integrantes em 17/10/2026. Consulte
[o relatório das alterações](docs/Atualizacao_3_2.md) e o [guia completo](LEIA-ME.txt).

## Atualizar uma instalação existente

Pare a versão antiga e faça backup do banco. Extraia esta versão em outra pasta.

```sh
npm ci
npm run setup:env
```

Configure `.env` com a mesma conexão e o mesmo nome de banco da versão anterior.
Depois, com MySQL ativo:

```sh
npm run db:setup
npm run build
npm start
```

Abra http://localhost:3000. O preparador adiciona os campos novos sem excluir
cadastros ou históricos. O banco completo em TXT é fornecido separadamente para
instalações novas; `database/schema.sql` é usado pelo preparador.

## Administrador

Use **Acesso do administrador** no login: `admin@almox.est`, senha `admin$777`.
Para recuperar a conta principal em uma instalação preparada:

```sh
npm run admin:reset
```

O comando não promove uma conta comum nem resolve automaticamente conflitos de
e-mail. A exclusão de produto exige a senha adicional `#DeleAll42`.

## Verificações específicas das alterações

```sh
npm run test:changes
```

São verificações isoladas e com conexões simuladas. Não comprovam a instalação
em MySQL nem o comportamento visual no navegador. As suítes históricas não
foram executadas nesta revisão. Os dados de entrada desses arquivos foram
adaptados somente onde os novos campos e regras exigem isso.

## Estrutura

- `app`: interface e estilos.
- `components/insights.tsx`: novo painel de resultados.
- `lib/contact.ts`: máscaras, sugestões de DDD/UF e busca.
- `lib/locations.ts` e `lib/municipios.ts`: localização validada localmente.
- `lib/metrics.ts`: cálculos de receita, entradas e estoque.
- `server`: API, banco, auditoria e preparação/recuperação da conta principal.
- `tests/changes-3-2.test.mjs`: verificações dos ajustes desta revisão.
- `docs/anotacoes-equipe`: arquivos originais recebidos dos integrantes.
- `docs/arquivo-v3` e `docs/arquivo-3-1`: materiais históricos.

As funcionalidades aprovadas de movimentação e transação foram preservadas.
O painel calcula receita bruta de saídas; não calcula lucro sem dados de custo.
