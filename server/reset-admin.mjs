import { createPool } from './db.mjs';
import { resetAdmin } from './admin-account.mjs';
const pool=createPool();
try {
 const conn=await pool.getConnection();
 try{await resetAdmin(conn);}finally{conn.release();}
 console.log('Conta administrativa recuperada: admin@almox.est / admin$777. Entre novamente; não é necessário recriar o banco.');
}finally{await pool.end();}
