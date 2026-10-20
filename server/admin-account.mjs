import { hashPassword } from './auth.mjs';
export const adminId='11111111-1111-1111-1111-111111111111';
export async function resetAdmin(conn) {
 const [owners]=await conn.execute('SELECT id FROM usuarios WHERE email=?',['admin@almox.est']);
 if(owners.length && owners[0].id!==adminId)throw Error('admin@almox.est pertence a outro cadastro. Revise este registro no MySQL antes de recuperar a conta principal; nenhum funcionário foi promovido.');
 await conn.beginTransaction();
 try {
  const hash=await hashPassword('admin$777');
  await conn.execute("INSERT INTO usuarios(id,nome,email,perfil,conta_sistema,senha_hash) VALUES(?,?,?,'admin',1,?) ON DUPLICATE KEY UPDATE nome='Administrador',email='admin@almox.est',senha_hash=?,perfil='admin',conta_sistema=1",[adminId,'Administrador','admin@almox.est',hash,hash]);
  await conn.execute('DELETE FROM sessoes WHERE usuario_id=?',[adminId]);
  await conn.commit();
 }catch(e){await conn.rollback();throw e;}
}
