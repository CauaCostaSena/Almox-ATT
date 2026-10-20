// Verificações exclusivas das alterações pedidas nas anotações de 17/10.
// Não executa novamente a suíte de funcionalidades aprovadas pela equipe.
import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCpf,formatPhone,suggestState,suggestPhoneForState,searchProducts} from '../lib/contact.ts';
import {employeeInput,validCpf} from '../lib/rules.ts';
import {addressInput,citiesByState} from '../lib/locations.ts';
import {buildMetrics} from '../lib/metrics.ts';
import {validDeletionPassword} from '../server/deletion.mjs';
import {saveStock,register,saveAdmin} from '../server/service.mjs';
import {resetAdmin,adminId} from '../server/admin-account.mjs';
import {verifyPassword} from '../server/auth.mjs';
const person={nome:'Cauã',cpf:'111.111.111-11',telefone:'(71) 99852-6587',email:'caua@almox.est',nascimento:'2000-01-01',cargo:'Estoquista',pais:'BR',estado:'BA',cidade:'Salvador',bairro:'Campinas de Pirajá',senha:'senha123'};
function mockPool(row={id:'p1',nome:'Produto',preco:'20.00',quantidade:10}) {
 const calls=[];
 const conn={query:async(sql)=>{calls.push([sql]);return [[],[]]},execute:async(sql,params=[])=>{calls.push([sql,params]);return [sql.startsWith('SELECT')?[row]:{affectedRows:1},[]]},beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
 return {pool:{getConnection:async()=>conn},conn,calls};
}
test('ALT01 CPF e telefone recebem a máscara solicitada',()=>{
 assert.equal(formatCpf('11111111111'),'111.111.111-11');
 assert.equal(formatPhone('71998526587'),'(71) 99852-6587');
 assert.equal(formatPhone('7133334444'),'(71) 3333-4444');
 assert.equal(formatCpf(''),'');assert.equal(formatPhone(''),'');
});
test('ALT02 CPF fictício é aceito como 11 números e fica normalizado',()=>{
 assert.equal(validCpf('11111111111'),true);
 assert.equal(employeeInput(person,'2026-10-17').cpf,'11111111111');
 assert.equal(validCpf('123'),false);assert.equal(validCpf('123456789012'),false);
});
test('ALT03 nascimento futuro recebe recusa específica',()=>{
 assert.throws(()=>employeeInput({...person,nascimento:'2027-01-01'},'2026-10-17'),/futuro/);
});
test('ALT04 cidade pertence à UF e bairro é validado',()=>{
 assert.equal(addressInput(person).cidade,'Salvador');
 assert.ok(citiesByState.SP.includes('São Paulo'));
 assert.throws(()=>addressInput({...person,cidade:'NEYMARLÂNDIA'}),/cidade/);
 assert.throws(()=>addressInput({...person,cidade:'São Paulo'}),/cidade/);
 assert.throws(()=>addressInput({...person,bairro:''}),/Bairro/);
 // Reversão de fotografia antiga não inventa cidade/bairro.
 assert.equal(employeeInput({...person,cidade:null,bairro:null},'2026-10-17',true).cidade,null);
});
test('ALT05 sugestão DDD e UF evita suposição no DDD compartilhado 61',()=>{
 assert.equal(suggestState('71998526587'),'BA');
 assert.equal(suggestPhoneForState('11998526587','BA'),'71998526587');
 assert.equal(suggestState('61998526587'),'');
 assert.equal(suggestState('61998526587','GO'),'GO');
});
test('ALT06 busca tolera espaços e acentos e retorna vazio corretamente',()=>{
 const items=[{nome:'Café'},{nome:'Mouse'}];
 assert.deepEqual(searchProducts(items,'  CAFE '),[items[0]]);
 assert.deepEqual(searchProducts(items,'inexistente'),[]);
 assert.deepEqual(searchProducts(items,'  '),items);
});
test('ALT07 senha de exclusão é exigida também no serviço',async()=>{
 const {pool,calls}=mockPool();
 for(const senha_exclusao of ['', 'errada'])await assert.rejects(saveStock(pool,{action:'excluir',id:'p1',senha_exclusao},{id:'u',nome:'Cauã',email:'caua@almox.est'}),/Senha de exclusão incorreta/);
 assert.equal(calls.length,0);
 assert.equal(validDeletionPassword('#DeleAll42'),true);
});
test('ALT08 exclusão autorizada preserva o e-mail e referência do produto',async()=>{
 const {pool,calls}=mockPool();
 await saveStock(pool,{action:'excluir',id:'p1',senha_exclusao:'#DeleAll42'},{id:'u',nome:'Cauã',email:'caua@almox.est'});
 const event=calls.find(([sql])=>sql.startsWith('INSERT INTO movimentacoes'));
 assert.ok(event[0].includes('usuario_email'));assert.equal(event[1][6],'caua@almox.est');assert.equal(event[1][3],'p1');
 assert.equal(event[1].length,12);assert.equal(event[1].includes('#DeleAll42'),false);
});
test('ALT09 novo cadastro transmite cidade bairro e e-mail à persistência',async()=>{
 const {pool,calls}=mockPool();
 await register(pool,person);
 const insert=calls.find(([sql])=>sql.startsWith('INSERT INTO usuarios'));
 assert.equal(insert[1].length,13);assert.equal(insert[1][10],'Salvador');assert.equal(insert[1][11],'Campinas de Pirajá');
 const event=calls.find(([sql])=>sql.startsWith('INSERT INTO auditoria_admin'));
 assert.equal(event[1][6],'caua@almox.est');
});
test('ALT10 recuperação define conta principal e senha exigida sem promover outro cadastro',async()=>{
 const {conn,calls}=mockPool({id:adminId});
 await resetAdmin(conn);
 const seed=calls.find(([sql])=>sql.startsWith('INSERT INTO usuarios'));
 assert.ok(seed[0].includes("perfil='admin'"));assert.equal(await verifyPassword('admin$777',seed[1][3]),true);
 assert.ok(calls.some(([sql])=>sql.startsWith('DELETE FROM sessoes')));
 const other=mockPool({id:'funcionario'});await assert.rejects(resetAdmin(other.conn),/nenhum funcionário foi promovido/);
});
test('ALT11 painéis usam preço da saída, referência preservada e mês em Brasília',()=>{
 const products=[{id:'p1',nome:'Produto novo',preco:'99.00',quantidade:2}];
 const events=[
  {acao:'saida',alvo_id:null,alvo_ref:'p1',alvo_nome:'Produto antigo',quantidade:2,antes:{preco:'20.00'},criado_em:'2026-10-03 15:00:00'},
  {acao:'entrada',alvo_ref:'p1',alvo_nome:'Produto antigo',quantidade:3,depois:{preco:'15.00'},criado_em:'2026-10-02 15:00:00'},
  {acao:'cadastro',alvo_ref:'p1',alvo_nome:'Produto antigo',quantidade:1,depois:{preco:'10.00'},criado_em:'2026-10-01 15:00:00'},
  {acao:'saida',alvo_ref:'p1',alvo_nome:'Produto antigo',quantidade:1,antes:{preco:'20.00'},criado_em:'2026-10-01 01:00:00'}
 ];
 const m=buildMetrics(products,events,'2026-10');
 assert.equal(m.receita,40);assert.equal(m.recebido,55);assert.equal(m.valorEstoque,198);assert.equal(m.sold[0].quantidade,2);assert.equal(m.daily[2].receita,40);
 assert.equal(buildMetrics(products,events,'2026-09').receita,20);
 assert.equal(buildMetrics([],[],'2026-10').receita,0);
});
test('ALT12 edição de funcionário inclui nova localização e e-mail do autor',async()=>{
 const current={...person,id:'u1',conta_sistema:0};const {pool,calls}=mockPool(current);
 await saveAdmin(pool,{...person,id:'u1',action:'editar',bairro:'Centro'},{id:'admin',nome:'Administrador',email:'admin@almox.est',perfil:'admin'});
 const update=calls.find(([sql])=>sql.startsWith('UPDATE usuarios SET nome'));
 assert.ok(update[0].includes('cidade=?,bairro=?'));assert.equal(update[1][10],'Centro');assert.equal(update[1].length,12);
 const audit=calls.find(([sql])=>sql.startsWith('INSERT INTO auditoria_admin'));
 assert.equal(audit[1][6],'admin@almox.est');assert.equal(JSON.parse(audit[1][9]).bairro,'Centro');
});
