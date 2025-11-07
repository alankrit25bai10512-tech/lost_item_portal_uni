const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.static('.'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/report', async (req, res) => {
  try {
    const { fullname, itemname, location, datelost, description, contact } = req.body;
    
    const query = `
      INSERT INTO lost_items (fullname, itemname, location, datelost, description, contact, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    await pool.query(query, [fullname, itemname, location, datelost, description, contact]);
    res.redirect('/success.html');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error submitting report');
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { regNumber, password } = req.body;
    
    const query = `
      INSERT INTO users (reg_number, password, created_at)
      VALUES ($1, $2, NOW())
    `;
    
    await pool.query(query, [regNumber, password]);
    res.redirect('/register-success.html');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error registering user');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { regNumber, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE reg_number = $1 AND password = $2';
    const result = await pool.query(query, [regNumber, password]);
    
    if (result.rows.length > 0) {
      res.redirect('/report.html');
    } else {
      res.send('<script>alert("Invalid credentials"); window.location="/login.html";</script>');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error logging in');
  }
});

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lost_items (
        id SERIAL PRIMARY KEY,
        fullname VARCHAR(255) NOT NULL,
        itemname VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        datelost DATE NOT NULL,
        description TEXT,
        contact VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        reg_number VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initDB();
});