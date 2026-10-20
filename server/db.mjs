import mysql from "mysql2/promise";
export function createPool() {
  const database = process.env.DB_NAME;
  if (!database)
    throw Error("Configure DB_NAME no arquivo .env. Consulte LEIA-ME.txt.");
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 5,
    multipleStatements: false,
  });
}
export async function transaction(pool, work) {
  const c = await pool.getConnection();
  try {
    await c.query("SET time_zone = '+00:00'");
    await c.beginTransaction();
    const result = await work(c);
    await c.commit();
    return result;
  } catch (e) {
    try {
      await c.rollback();
    } catch (rollbackError) {
      console.error("Falha ao desfazer transação:", rollbackError.message);
    }
    throw e;
  } finally {
    c.release();
  }
}
