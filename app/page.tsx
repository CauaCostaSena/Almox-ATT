import { useEffect, useState, type FormEvent } from "react";
import {
  Package,
  Plus,
  Search,
  ArrowDownUp,
  Pencil,
  Trash2,
  LogOut,
  History,
  Users,
  ShieldCheck,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { countries, states, citiesByState } from "../lib/locations";
import { formatCpf, formatPhone, digits, suggestState, suggestPhoneForState, localToday, searchProducts } from "../lib/contact";
import { Insights } from "../components/insights";
type Row = Record<string, any>;
const money = (v: any) =>
  "R$" +
  Number(v ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const blank = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  nascimento: "",
  cargo: "",
  pais: "BR",
  estado: "",
  cidade: "",
  bairro: "",
  senha: "",
};
const labels: Row = {
  nome: "Nome",
  cpf: "CPF",
  telefone: "Telefone",
  email: "E-mail",
  nascimento: "Data de nascimento",
  cargo: "Cargo",
  senha: "Senha",
  preco: "Preço",
  quantidade: "Saldo",
  idade: "Idade",
  pais: "País",
  estado: "Estado",
  cidade: "Cidade",
  bairro: "Bairro",
};
const actions: Row = {
  cadastro: "Cadastro",
  edicao: "Edição",
  entrada: "Entrada",
  saida: "Saída",
  exclusao: "Exclusão",
  reversao: "Reversão",
};
async function api(path: string, data?: Row) {
  const r = await fetch("/api/" + path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const b = await r.json();
  if (!r.ok) throw Object.assign(Error(b.error), { status: r.status });
  return b;
}
export default function Home() {
  const [user, U] = useState<Row | null>(null),
    [loading, L] = useState(true),
    [signup, S] = useState(false),
    [auth, A] = useState<Row>({ ...blank }),
    [error, E] = useState(""),
    [notice, N] = useState(""),
    [busy, B] = useState(false),
    [products, P] = useState<Row[]>([]),
    [events, H] = useState<Row[]>([]),
    [users, US] = useState<Row[]>([]),
    [admin, AD] = useState<Row[]>([]),
    [tab, T] = useState("produtos"),
    [search, Q] = useState(""),
    [modal, M] = useState(""),
    [form, F] = useState<Row>({}),
    [confirm, C] = useState<Row | null>(null),
    [deletePassword, DP] = useState(""),
    [adminAccess, AA] = useState(false);
  async function refresh(u = user) {
    const s = await api("estoque");
    P(s.products);
    H(s.movements);
    if (u?.perfil === "admin") {
      const a = await api("admin");
      US(a.users);
      AD(a.events);
    }
  }
  useEffect(() => {
    api("me")
      .then(async (r) => {
        U(r.user);
        await refresh(r.user);
      })
      .catch((e) => {
        if (e.status !== 401) E(e.message);
      })
      .finally(() => L(false));
  }, []);
  async function run(path: string, data: Row) {
    B(true);
    E("");
    N("");
    try {
      await api(path, data);
      M("");
      C(null);
      await refresh();
      N("Operação concluída e registrada no histórico.");
    } catch (e: any) {
      E(e.message);
      if (e.status === 401) {
        U(null);
        M("");
        C(null);
      }
    } finally {
      B(false);
    }
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    B(true);
    E("");
    N("");
    try {
      if (signup) {
        await api("cadastro", auth);
        S(false);
        A({ ...blank, email: auth.email });
        N("Cadastro realizado. Entre com seu e-mail e senha.");
      } else {
        await api("login", auth);
        const r = await api("me");
        U(r.user);
        A({ ...blank });
        await refresh(r.user);
      }
    } catch (e: any) {
      E(e.message);
    } finally {
      B(false);
    }
  }
  function input(k: string, v: Row, set: (v: Row) => void) {
    return (
      <label key={k}>
        {labels[k]}
        <input
          required
          type={
            k === "senha"
              ? "password"
              : k === "email"
                ? "email"
                : k === "nascimento"
                  ? "date"
                  : "text"
          }
          inputMode={["cpf", "telefone"].includes(k) ? "numeric" : undefined}
          max={k === "nascimento" ? localToday() : undefined}
          maxLength={
            k === "cpf" ? 14 : k === "telefone"
              ? 15
              : k === "senha"
                ? 128
                : k === "email"
                  ? 150
                  : 100
          }
          minLength={k === "senha" ? 6 : undefined}
          placeholder={
            k === "email"
              ? "seunome@almox.est"
              : k === "cpf"
                ? "000.000.000-00"
                : k === "telefone" ? "(71) 99852-6587"
                : undefined
          }
          value={k === "cpf" ? formatCpf(v[k]) : k === "telefone" ? formatPhone(v[k]) : (v[k] ?? "")}
          onChange={(e) => {
            if (["cpf", "telefone"].includes(k)) {
              let clean=digits(e.target.value).slice(0,11);
              const native=e.nativeEvent as InputEvent;
              // Apagar separadores da máscara também deve permitir continuar apagando os dígitos.
              if(native.inputType?.startsWith('delete') && clean===digits(v[k])) {
                const pos=e.target.selectionStart ?? e.target.value.length;
                const index=digits(e.target.value.slice(0,pos)).length;
                const remove=native.inputType==='deleteContentForward'?index:Math.max(0,index-1);
                clean=clean.slice(0,remove)+clean.slice(remove+1);
              }
              const uf=k==='telefone' && clean.slice(0,2)!==digits(v.telefone).slice(0,2) ? suggestState(clean,v.estado) : '';
              set({...v,[k]:clean,...(uf&&uf!==v.estado?{estado:uf,cidade:'',bairro:''}:{})});
            } else set({...v,[k]:e.target.value});
          }}
        />
      </label>
    );
  }
  function person(v: Row, set: (v: Row) => void) {
    return (
      <>
        {input("nome", v, set)}
        <div className="form-grid">
          {input("cpf", v, set)}
          {input("telefone", v, set)}
        </div>
        {input("email", v, set)}
        <div className="form-grid">
          {input("nascimento", v, set)}
          {input("cargo", v, set)}
        </div>
        <div className="form-grid">
          <label>
            País
            <select
              required
              value={v.pais ?? "BR"}
              onChange={(e) => set({ ...v, pais: e.target.value, estado: "", cidade:"", bairro:"" })}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select
              required
              value={v.estado ?? ""}
              onChange={(e) => set({ ...v, estado: e.target.value, cidade:"", bairro:"", telefone:suggestPhoneForState(v.telefone,e.target.value) })}
            >
              <option value="">Selecione o estado</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>Cidade<select required disabled={!v.estado} value={v.cidade ?? ""} onChange={e=>set({...v,cidade:e.target.value,bairro:""})}>
            <option value="">{v.estado ? "Selecione a cidade" : "Selecione o estado primeiro"}</option>
            {(citiesByState[v.estado] ?? []).map(cidade=><option key={cidade} value={cidade}>{cidade}</option>)}
          </select></label>
          {input("bairro",v,set)}
        </div>
        <p className="form-hint">A partir de 16 anos. CPF fictício permitido, com 11 números. DDD e estado sugerem um ao outro; confira o DDD da sua região.</p>
      </>
    );
  }
  const alert = (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success" role="status">
          {notice}
        </div>
      )}
    </>
  );
  function edit(p?: Row) {
    E("");
    F(
      p
        ? { ...p, preco: money(p.preco).replaceAll(".", "") }
        : { nome: "", preco: "R$0,00", quantidade: 0 },
    );
    M("produto");
  }
  function ask(path: string, data: Row) {
    DP("");
    E("");
    C({
      path,
      data,
      message:
        data.action === "excluir"
          ? "Tem certeza que deseja realizar essa exclusão? Não será possível reverter essa ação!"
          : data.action === "reverter"
            ? "Reverter esta edição? A reversão também ficará registrada no histórico."
            : "Tem certeza que deseja realizar essa edição? As alterações poderão ser revertidas pelo histórico.",
    });
  }
  function history(rows: Row[], isAdmin = false) {
    return (
      <div className="event-list">
        {!rows.length && (
          <div className="empty">Nenhuma movimentação registrada.</div>
        )}
        {rows.map((e) => {
          const before =
              typeof e.antes === "string"
                ? JSON.parse(e.antes)
                : (e.antes ?? {}),
            after =
              typeof e.depois === "string"
                ? JSON.parse(e.depois)
                : (e.depois ?? {});
          const keys = [
            ...new Set([...Object.keys(before), ...Object.keys(after)]),
          ].filter((k) => before[k] !== after[k]);
          const val = (k: string, v: any) =>
            v == null ? "—" : k === "preco" ? money(v) : k === "cpf" ? formatCpf(v) : k === "telefone" ? formatPhone(v) : String(v);
          return (
            <article className="event" key={e.id}>
              <div className="event-title">
                <span
                  className={"badge " + (e.acao === "exclusao" ? "out" : "")}
                >
                  {actions[e.acao]}
                </span>
                <strong>{e.alvo_nome}</strong>
                <time>
                  {new Date(e.criado_em.replace(" ", "T") + "Z").toLocaleString(
                    "pt-BR",
                    { timeZone: "America/Sao_Paulo" },
                  )}
                </time>
              </div>
              <p className="event-actor">
                Realizado por <b>{e.usuario_email || (e.usuario_nome + " · registro antigo sem e-mail")}</b>
                {e.quantidade != null
                  ? " · " + e.quantidade + " unidade(s)"
                  : ""}
              </p>
              <div className="change-grid">
                {keys.map((k) => (
                  <div key={k}>
                    <b>{labels[k] ?? k}:</b>{" "}
                    <span className="muted">{val(k, before[k])}</span> →{" "}
                    {val(k, after[k])}
                  </div>
                ))}
              </div>
              {e.observacao && <p>{e.observacao}</p>}
              {e.acao === "edicao" && e.alvo_id && !e.revertido && (
                <button
                  className="secondary revert"
                  disabled={busy}
                  onClick={() =>
                    ask(isAdmin ? "admin" : "estoque", {
                      action: "reverter",
                      id: e.id,
                    })
                  }
                >
                  Reverter edição
                </button>
              )}
              {!!e.revertido && (
                <small className="muted">Edição revertida</small>
              )}
            </article>
          );
        })}
      </div>
    );
  }
  if (loading) return <div className="empty">Carregando sua sessão…</div>;
  if (!user)
    return (
      <div className="auth-layout">
        <aside className="auth-story">
          <div className="brand">
            <Package size={36} />
            almox<span>.</span>
          </div>
          <div>
            <p className="eyebrow">CADA ITEM, NO SEU LUGAR</p>
            <h1>
              Seu estoque.
              <br />
              Sob controle.
            </h1>
            <p>
              Produtos organizados, movimentações seguras e um histórico que
              acompanha cada decisão.
            </p>
            <div className="auth-pills">
              <span>Estoque em tempo real</span>
              <span>Histórico de alterações</span>
            </div>
          </div>
          <small>Gestão de estoque • Acesso da equipe</small>
        </aside>
        <section className="auth-card">
          <p className="eyebrow">BEM-VINDO AO ALMOX</p>
          <h2>{signup ? "Faça parte da equipe" : "Acesse sua conta"}</h2>
          <p className="subtitle">
            {signup
              ? "Preencha seus dados profissionais."
              : "Entre para cuidar do seu estoque."}
          </p>
          {alert}
          <form className="stock-form" onSubmit={login}>
            {signup ? person(auth, A) : input("email", auth, A)}
            {input("senha", auth, A)}
            <button className="primary" disabled={busy}>
              {busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}
            </button>
          </form>
          {!signup && <><button className="auth-switch admin-access" onClick={()=>{AA(!adminAccess);A({...blank,email:adminAccess?"":"admin@almox.est"});E("");N("");}}><ShieldCheck size={16}/>{adminAccess?"Entrar como funcionário":"Acesso do administrador"}</button>
          {adminAccess && <p className="form-hint admin-hint">Entre com a conta principal admin@almox.est. Se a senha não funcionar, o responsável pela instalação pode recuperar a conta seguindo o LEIA-ME.</p>}</>}
          <button
            className="auth-switch"
            onClick={() => {
              AA(false);
              S(!signup);
              E("");
              N("");
            }}
          >
            {signup ? "Já tenho conta. Entrar" : "Primeiro acesso? Cadastre-se"}
          </button>
        </section>
      </div>
    );
  const filtered = searchProducts(products as (Row & {nome:string})[], search);
  return (
    <>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Package size={31} />
          </span>
          almox
          <span className="brand-divider" />
          <span className="brand-caption">GESTÃO DE ESTOQUE</span>
        </a>
        <div className="user-menu">
          <span>
            {user.email}
            <small>
              {user.perfil === "admin" ? "Administrador" : user.cargo}
            </small>
          </span>
          <button
            aria-label="Sair da conta"
            onClick={async () => {
              try {
                await api("logout", {});
                U(null);
                T("produtos");
                E("");
                N("");
              } catch (e: any) {
                E(e.message);
              }
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">VISÃO GERAL DO ALMOXARIFADO</p>
            <h1>
              Estoque organizado<span>.</span>
            </h1>
            <p className="subtitle">
              Acompanhe seus produtos e cada movimentação da equipe.
            </p>
          </div>
          <button className="primary" onClick={() => edit()}>
            <Plus size={18} /> Novo produto
          </button>
        </div>
        {alert}
        <div className="stats">
          {[
            [
              "Valor em estoque",
              money(
                products.reduce(
                  (s, p) => s + Number(p.preco) * p.quantidade,
                  0,
                ),
              ),
              "Preço × quantidade disponível",
            ],
            ["Produtos cadastrados", products.length, "Itens no catálogo"],
            [
              "Unidades disponíveis",
              products.reduce((s, p) => s + p.quantidade, 0),
              "Saldo total do estoque",
            ],
            [
              "Produtos sem estoque",
              products.filter((p) => !p.quantidade).length,
              "Itens que precisam de reposição",
            ],
          ].map(([l, v, d], i) => (
            <div className={"stat " + (!i ? "feature" : "")} key={l}>
              <div className="stat-label">{l}</div>
              <strong>{v}</strong>
              <span>{d}</span>
            </div>
          ))}
        </div>
        <nav className="nav-tabs" aria-label="Seções">
          <button
            className={tab === "produtos" ? "active" : ""}
            onClick={() => T("produtos")}
          >
            <Package size={17} /> Produtos
          </button>
          <button
            className={tab === "historico" ? "active" : ""}
            onClick={() => T("historico")}
          >
            <History size={17} /> Movimentações
          </button>
          <button className={tab === "resultados" ? "active" : ""} onClick={()=>T("resultados")}><ChartNoAxesCombined size={17}/> Resultados</button>
          {user.perfil === "admin" && (
            <>
              <button
                className={tab === "equipe" ? "active" : ""}
                onClick={() => T("equipe")}
              >
                <Users size={17} /> Funcionários
              </button>
              <button
                className={tab === "admin" ? "active" : ""}
                onClick={() => T("admin")}
              >
                <ShieldCheck size={17} /> Movimentações de admin
              </button>
            </>
          )}
        </nav>
        {tab === "resultados" ? <Insights products={products} events={events}/> : <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {
                  (
                    {
                      produtos: "Catálogo de produtos",
                      historico: "Histórico do estoque",
                      equipe: "Equipe do almoxarifado",
                      admin: "Histórico de administração",
                    } as Row
                  )[tab]
                }
              </h2>
              <p>
                {tab === "produtos"
                  ? "Cadastre, edite e acompanhe a disponibilidade."
                  : tab === "equipe"
                    ? "Dados profissionais e controle de acesso."
                    : "Registros preservados, inclusive após exclusões. Horário de Brasília."}
              </p>
            </div>
          </div>
          {tab === "produtos" && (
            <>
              <div className="toolbar">
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar produtos"
                    placeholder="Buscar pelo nome do produto…"
                    value={search}
                    onChange={(e) => Q(e.target.value)}
                  />
                </label>
                <button
                  className="secondary"
                  onClick={() => refresh().catch((e) => E(e.message))}
                >
                  Atualizar
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUTO</th>
                      <th>PREÇO UNITÁRIO</th>
                      <th>SALDO</th>
                      <th>STATUS</th>
                      <th>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.id}>
                        <td>
                          <div className="product-name">
                            <span className={"product-icon color-" + (i % 4)}>
                              <Package size={19} />
                            </span>
                            <b>{p.nome}</b>
                          </div>
                        </td>
                        <td>{money(p.preco)}</td>
                        <td>{p.quantidade} un.</td>
                        <td>
                          <span
                            className={"badge " + (!p.quantidade ? "zero" : "")}
                          >
                            {p.quantidade ? "Disponível" : "Sem estoque"}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              title="Movimentar"
                              aria-label={"Movimentar " + p.nome}
                              onClick={() => {
                                F({
                                  id: p.id,
                                  nome: p.nome,
                                  saldo: p.quantidade,
                                  tipo: "entrada",
                                  quantidade: 1,
                                  observacao: "",
                                });
                                M("movimento");
                                E("");
                              }}
                            >
                              <ArrowDownUp size={16} />
                            </button>
                            <button
                              title="Editar"
                              aria-label={"Editar " + p.nome}
                              onClick={() => edit(p)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              title="Excluir"
                              aria-label={"Excluir " + p.nome}
                              onClick={() =>
                                ask("estoque", { action: "excluir", id: p.id })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <div className="empty">
                  <Package size={36} />
                  <h3>{search.trim() ? "Nenhum produto encontrado" : "Seu estoque começa aqui"}</h3>
                  <p>{search.trim() ? <>Não encontramos produtos para “{search.trim()}”. Confira o nome ou limpe a busca.</> : "Cadastre um produto para começar a organizar o almoxarifado."}</p>
                  {search.trim() && <button className="secondary" onClick={()=>Q("")}>Limpar busca</button>}
                </div>
              )}
              <div className="table-foot">
                {filtered.length} produto(s) • Preços em reais
              </div>
            </>
          )}
          {tab === "historico" && history(events)}
          {tab === "admin" && history(admin, true)}
          {tab === "equipe" && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>FUNCIONÁRIO</th>
                    <th>CONTATO</th>
                    <th>CPF / NASCIMENTO</th>
                    <th>CARGO</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.nome}</b>
                        <small className="block muted">
                          {p.conta_sistema
                            ? "Conta principal"
                            : p.idade + " anos"}
                        </small>
                      </td>
                      <td>
                        {p.email}
                        <small className="block muted">{formatPhone(p.telefone)}</small>
                      </td>
                      <td>
                        {p.cpf ? formatCpf(p.cpf) : "—"}
                        <small className="block muted">
                          {p.nascimento?.split("-").reverse().join("/")}
                        </small>
                      </td>
                      <td>{p.cargo}</td>
                      <td>
                        {p.conta_sistema ? (
                          <span className="badge">Protegida</span>
                        ) : (
                          <div className="row-actions">
                            <button
                              aria-label={"Editar " + p.nome}
                              onClick={() => {
                                F(p);
                                M("funcionario");
                                E("");
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              aria-label={"Excluir " + p.nome}
                              onClick={() =>
                                ask("admin", { action: "excluir", id: p.id })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>}
        <footer>
          <span>
            <ShieldCheck size={15} /> Ações identificadas • Dados persistidos em
            MySQL
          </span>
          <span>Almox • Gestão de estoque</span>
        </footer>
      </main>
      <Dialog
        open={!!modal && !confirm}
        onOpenChange={(v) => {
          if (!v && !busy) M("");
        }}
      >
        <DialogContent className="stock-dialog">
          <DialogTitle>
            {modal === "produto"
              ? form.id
                ? "Editar produto"
                : "Novo produto"
              : modal === "funcionario"
                ? "Editar funcionário"
                : "Movimentar estoque"}
          </DialogTitle>
          <DialogDescription>
            {modal === "movimento"
              ? form.nome
              : "Preencha os dados. As alterações ficam registradas no histórico."}
          </DialogDescription>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form
            className="stock-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = {
                ...form,
                action:
                  modal === "movimento"
                    ? "movimentar"
                    : form.id
                      ? "editar"
                      : "produto",
              };
              if (modal === "funcionario") ask("admin", data);
              else if (data.action === "editar") ask("estoque", data);
              else run("estoque", data);
            }}
          >
            {modal === "funcionario" ? (
              person(form, F)
            ) : modal === "produto" ? (
              <>
                {input("nome", form, F)}
                <label>
                  Preço unitário (R$)
                  <input
                    required
                    inputMode="decimal"
                    value={form.preco}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 9);
                      F({
                        ...form,
                        preco:
                          "R$" + (Number(d) / 100).toFixed(2).replace(".", ","),
                      });
                    }}
                  />
                </label>
                {!form.id && (
                  <label>
                    Quantidade inicial
                    <input
                      required
                      type="number"
                      min={0}
                      max={1000000}
                      value={form.quantidade}
                      onChange={(e) =>
                        F({ ...form, quantidade: e.target.value })
                      }
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <div className="balance-box">
                  Saldo disponível<b>{form.saldo} unidades</b>
                </div>
                <label>
                  Tipo
                  <select
                    value={form.tipo}
                    onChange={(e) => F({ ...form, tipo: e.target.value })}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </label>
                <label>
                  Quantidade
                  <input
                    required
                    type="number"
                    min={1}
                    max={1000000}
                    value={form.quantidade}
                    onChange={(e) => F({ ...form, quantidade: e.target.value })}
                  />
                </label>
                <label>
                  Observação
                  <textarea
                    maxLength={200}
                    value={form.observacao}
                    onChange={(e) => F({ ...form, observacao: e.target.value })}
                  />
                </label>
              </>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => M("")}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v && !busy) C(null);
        }}
      >
        <DialogContent className="stock-dialog">
          <DialogTitle>Confirmar ação</DialogTitle>
          <DialogDescription
            className={
              confirm?.data.action === "excluir" ? "danger-warning" : ""
            }
          >
            {confirm?.message}
          </DialogDescription>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {confirm?.path === "estoque" && confirm.data.action === "excluir" && <label className="delete-password">Senha para excluir produto<input type="password" autoComplete="off" value={deletePassword} onChange={e=>DP(e.target.value)} placeholder="Informe a senha de exclusão" maxLength={128}/><small>A operação será registrada em nome de {user.email}.</small></label>}
          <div className="form-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => C(null)}
            >
              Cancelar
            </button>
            <button
              className={
                confirm?.data.action === "excluir"
                  ? "primary danger-button"
                  : "primary"
              }
              disabled={busy || (confirm?.path === "estoque" && confirm.data.action === "excluir" && !deletePassword)}
              onClick={() => confirm && run(confirm.path, {...confirm.data,...(confirm.path === "estoque" && confirm.data.action === "excluir" ? {senha_exclusao:deletePassword} : {})})}
            >
              {busy ? "Aguarde…" : "Confirmar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
