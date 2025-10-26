import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",       // your MySQL username
  password: "",       // your MySQL password
  database: "cashteen_db",
});

export default pool;
