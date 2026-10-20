# Almox 3.2 — alterações com base nos testes da equipe

Data da revisão: 17/10/2026. Base: pacote Almox 3.1.0 entregue anteriormente.
Os seis arquivos recebidos estão preservados em `docs/anotacoes-equipe`.

## Leitura das anotações

| Arquivo | Resultado informado | Tratamento desta revisão |
|---|---|---|
| Cauã Testes.txt | Acesso e cadastro aprovados; oito pedidos adicionais | Máscaras, CPF fictício, recusa de data futura, cidade/bairro, painéis, senha de exclusão e autor por e-mail. |
| Gabriel Santos.md | TU02, TA01, CE07, CE08 e CE09 aprovados | Nenhuma correção na regra de saldo, entrada ou saída; não foram reexecutados. |
| Kauan Gabriel Souza.md | Login, preço, TU01 e TS02 aprovados; CE06 parcial | Corrigida mensagem da busca vazia, incluído Limpar busca e normalização de espaços/acentos. |
| Miguel Estrela Dos Santos.md | Persistência e CE15 aprovados; CE14 bloqueado por acesso admin | Preservada persistência. Incluída recuperação de acesso administrativo; bloqueio de CE14 não foi convertido em aprovação. |
| Pablo Guimarães.md | CE12 aprovado; CE13 e TA02 inacessíveis; sugestão DDD/estado | Acesso administrativo visível, comando de recuperação e sugestões entre DDD e UF. |
| Gabriel Santiago.txt | TI02 e TI03 aprovados | Mantidos transação, rollback e bloqueio de linha; sem nova execução desses casos. |

São resultados declarados pelos integrantes, sem capturas ou logs anexos a estes
arquivos de texto. Um relato de aceitação não demonstra, por si, a validação por
outro grupo exigida na prova. As classificações originais foram preservadas.

## O que foi implementado

### Cadastro e edição de funcionários

- CPF exibido como `111.111.111-11`. Aceita 11 números fictícios, inclusive sem
  dígitos verificadores válidos. Unicidade de CPF/e-mail continua no banco.
- Telefone exibido como `(71) 99852-6587` ou máscara de telefone fixo de 10 dígitos.
  Os valores continuam armazenados apenas com números para consulta e unicidade.
- Data futura recebe recusa explícita; o formulário também limita a data ao dia
  atual de Brasília. A idade permitida continua sendo de 16 a 120 anos: aceitar
  o dia presente como nascimento contrariaria a regra mínima já definida.
- Cidade é selecionada a partir da UF e validada também pelo servidor. A lista
  de 5.571 municípios foi obtida da API do IBGE e incluída no código para uso offline.
- Bairro é obrigatório em novos cadastros/edições, com validação de tamanho e
  formato. Não há uma lista nacional de bairros incorporada nem comprovação de
  existência do endereço. Bairro permite números e pontuação de endereço.
- Novos campos são registrados no antes/depois das alterações administrativas.
- Ao digitar um DDD de UF única, a UF é sugerida. Ao trocar a UF, um DDD dessa UF
  é sugerido quando o atual não pertence à lista. O número local é preservado.
  Confira o DDD sugerido para a região.
  DDD 61 é compartilhado entre DF e GO; sem UF já selecionada, não é inferida
  uma UF para esse DDD. A cidade é limpa quando a UF muda.

### Produtos e histórico

- Mensagem de busca vazia distingue ausência de produtos de ausência de resultado
  para o termo pesquisado e oferece Limpar busca.
- Exclusão de produto exige a senha `#DeleAll42` além da confirmação vermelha.
  A exigência também existe no serviço do servidor: ocultar o campo na tela
  não permite excluir pela API. Senha errada ou ausente recusa a exclusão.
- A senha de exclusão não é gravada no histórico. O responsável continua sendo
  o usuário autenticado, sem troca de sessão para uma conta genérica.
- Movimentações e auditoria exibem e preservam o e-mail do autor.
  A fotografia do e-mail permanece mesmo se a pessoa for editada ou excluída.
- Nova referência histórica do alvo permite agrupar suas saídas mesmo após
  exclusão. Nome e dados anteriores continuam salvos.

### Administrador

Os relatos não mostram se a impossibilidade era senha, perfil ou banco apontado;
não é possível atribuir uma causa única sem esse detalhe. Foram implementadas
duas medidas concretas: entrada administrativa visível no login e comando
`npm run admin:reset`, além da recuperação pelo preparador `db:setup`.

O acesso é `admin@almox.est` / `admin$777`. A recuperação define o perfil correto
e encerra sessões antigas da conta principal. Não recria o banco nem promove
uma conta comum. Caso outro registro ocupe o mesmo e-mail, o processo informa
o conflito para revisão manual. O painel continua restrito ao perfil admin.

### Painéis na aba Resultados

- Vendas e receita: receita bruta das saídas, unidades vendidas, quantidade de
  produtos com saída, dias com vendas, gráfico diário e ranking de mais vendidos.
- Estoque e entradas: valor atual disponível, valor/unidades recebidos no mês,
  dias com entrada, gráfico diário, mais recebidos e composição do estoque.
- Seleção de mês, dados diários acessíveis em tabela, layout adaptável e animações
  de entrada/barras. Preferência de movimento reduzido é respeitada.
- Toda saída é considerada venda para esta atividade. A receita usa o preço
  registrado no evento, e não o preço atual alterado posteriormente.
- Cadastros com saldo inicial contam como recebimento. Exclusão não cria venda
  artificial. O estoque atual não é um saldo histórico do mês selecionado.
- O sistema não possui custo de compra ou despesas. Portanto a tela informa
  receita, sem chamar o resultado de lucro líquido.

## Banco e atualização sem apagar dados

`npm run db:setup` adiciona `usuarios.cidade` e `usuarios.bairro`, além de
`usuario_email` e `alvo_ref` em `movimentacoes` e `auditoria_admin`.
As novas colunas aceitam NULL para preservar dados legados; o servidor exige
cidade/bairro nos novos cadastros e edições. Reversões de fotografias legadas
não inventam endereços que não existiam.

Quando a conta antiga ainda existe, a migração preenche o e-mail da autoria
com o e-mail conhecido no momento da migração. Não é possível recuperar com
certeza um e-mail anterior a essa data ou de uma conta já apagada. Nesse caso
o site identifica o registro antigo como sem e-mail. Eventos novos guardam a
fotografia correta no momento da ação.

Referências de produtos apagados antes desta versão não podem ser recuperadas
com certeza; eventos sem referência usam o nome legado no agrupamento.
Produtos distintos antigos com o mesmo nome podem aparecer agrupados nesse caso.

O banco completo separado `Almox_Banco_MySQL_3_2.txt` é para instalação nova.
Para o banco existente, usar o preparador com a mesma configuração anterior,
conforme LEIA-ME.txt. A recuperação do administrador não é feita a cada login.

## Verificação realizada nesta revisão

Foram usados somente o build e as verificações de mudanças em
`tests/changes-3-2.test.mjs`. Não foram executadas as suítes completas de unidade,
integração, sistema ou aceitação já aprovadas/relatadas pela equipe.

O build foi concluído e as 12 verificações ALT01 a ALT12 passaram. Os logs estão
em `docs/validacao-3-2`. O novo painel também gerou HTML por renderização estática
do React; isso não substitui revisão visual.

As verificações ALT01 a ALT12 cobrem máscaras, CPF fictício, data futura,
cidade/bairro, DDD/UF, busca, exigência da senha de exclusão, persistência do
e-mail/referência nos comandos, novos campos de cadastro, recuperação da conta
principal, cálculos mensais e edição administrativa com os novos campos.

As chamadas de persistência usam conexões simuladas. Não houve execução desta
versão com MySQL real ou revisão visual em navegador. O ambiente atual não
disponibiliza essa combinação de serviços/controle de navegador para a revisão.
Não se declara CE13, CE14 ou TA02 aprovado a partir de simulações.

Os arquivos históricos de automação tiveram apenas entradas/assertivas
incompatíveis com os pedidos novos ajustadas: cidade/bairro, máscara de CPF,
CPF fictício e senha de exclusão. Não foram executados novamente.

## Roteiro para conferir somente os pontos afetados

1. Atualizar o banco com `db:setup` e entrar pelo Acesso do administrador.
2. Cadastrar CPF fictício, conferir máscaras, cidade/bairro e sugestão DDD/UF.
3. Tentar data futura e buscar termo sem resultado.
4. Excluir produto com senha vazia/errada e depois com a senha solicitada.
5. Conferir e-mail do autor e nova localização nos históricos.
6. Abrir Resultados e comparar um período com as movimentações existentes.

Estes pontos ficam para conferência no computador da equipe; não são uma ordem
para repetir casos já aprovados que não foram afetados por novos requisitos.

## Fontes de localização

- IBGE, API de Localidades: https://servicodados.ibge.gov.br/api/docs/localidades
- Dados usados: https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome
- Anatel, Códigos Nacionais: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais

Consulta em 17/10/2026. A base incluída no código pode ser atualizada futuramente
caso ocorram mudanças oficiais de municípios ou códigos de área.
