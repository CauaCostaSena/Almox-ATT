import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {resetAdmin} from './admin-account.mjs';

// Migração aditiva: rode com o servidor parado e backup prévio.
const database=process.env.DB_NAME;
if(!database||!/^[a-zA-Z0-9_]+$/.test(database))throw Error('Configure DB_NAME com letras, números e sublinhado.');
const conn=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD??'',multipleStatements:true});
try{
 await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE \`${database}\`; SET time_zone = '+00:00';`);
 await conn.query(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
 const [columns]=await conn.query('SHOW COLUMNS FROM usuarios');
 for(const name of ['pais','estado'])if(!columns.some(c=>c.Field===name))await conn.query(`ALTER TABLE usuarios ADD COLUMN ${name} CHAR(2) NULL`);
 // Localização legada permanece NULL, sem inventar dados de funcionários.
 for (const [name,type] of [['cidade','VARCHAR(100)'],['bairro','VARCHAR(100)']])if(!columns.some(c=>c.Field===name))await conn.query(`ALTER TABLE usuarios ADD COLUMN ${name} ${type} NULL`);
 for (const table of ['movimentacoes','auditoria_admin']) {
  const [cols]=await conn.query(`SHOW COLUMNS FROM ${table}`);
  for(const [name,type] of [['usuario_email','VARCHAR(150)'],['alvo_ref','CHAR(36)']])if(!cols.some(c=>c.Field===name))await conn.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${type} NULL`);
  // Recupera somente o e-mail conhecido hoje. Não inventa autoria de conta já apagada.
  await conn.query(`UPDATE ${table} e JOIN usuarios u ON u.id=e.usuario_id SET e.usuario_email=u.email WHERE e.usuario_email IS NULL`);
  await conn.query(`UPDATE ${table} SET alvo_ref=alvo_id WHERE alvo_ref IS NULL AND alvo_id IS NOT NULL`);
 }
 await resetAdmin(conn);
 try{await conn.query('CREATE EVENT IF NOT EXISTS atualizar_idades ON SCHEDULE EVERY 1 DAY DO UPDATE usuarios SET idade=TIMESTAMPDIFF(YEAR,nascimento,DATE(UTC_TIMESTAMP()-INTERVAL 3 HOUR)) WHERE nascimento IS NOT NULL');}
 catch(e){if(e.code==='ER_SPECIFIC_ACCESS_DENIED_ERROR')console.warn('Sem privilégio EVENT: idade será atualizada pelo servidor.');else throw e;}
 console.log(`Banco ${database} atualizado. Produtos e funcionários preservados. Senha admin redefinida; sessões admin encerradas.`);
}finally{await conn.end();}
