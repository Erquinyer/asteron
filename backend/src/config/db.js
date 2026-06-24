import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Pool de conexiones: reutiliza conexiones en lugar de abrir una nueva por petición
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'asteron',
  waitForConnections: true,
  connectionLimit: 10,
})

export default pool
