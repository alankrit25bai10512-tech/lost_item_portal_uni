const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Middleware
app.use(express.static('.'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Input validation middleware
const validateInput = (req, res, next) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === 'string' && !validator.isLength(value.trim(), { min: 1, max: 1000 })) {
      return res.send(`<script>alert("Invalid ${key}"); window.history.back();</script>`);
    }
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/report', validateInput, async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullname, itemname, location, datelost, description, contact } = req.body;
    
    if (!validator.isEmail(contact) && !validator.isMobilePhone(contact)) {
      return res.send('<script>alert("Invalid contact format. Please enter a valid email or phone number."); window.history.back();</script>');
    }
    
    if (!validator.isDate(datelost)) {
      return res.send('<script>alert("Invalid date format"); window.history.back();</script>');
    }
    
    const query = `
      INSERT INTO lost_items (fullname, itemname, location, datelost, description, contact, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    await client.query(query, [fullname, itemname, location, datelost, description, contact]);
    res.redirect('/success.html');
  } catch (error) {
    console.error('Database error in /api/report:', error.message);
    res.send('<script>alert("Failed to submit report. Please try again."); window.history.back();</script>');
  } finally {
    client.release();
  }
});

app.post('/api/register', validateInput, async (req, res) => {
  const client = await pool.connect();
  try {
    const { regNumber, password } = req.body;
    
    if (!validator.isLength(password, { min: 8 })) {
      return res.send('<script>alert("Password must be at least 8 characters"); window.location="/login.html";</script>');
    }
    
    if (!validator.isAlphanumeric(regNumber)) {
      return res.send('<script>alert("Invalid registration number format"); window.location="/login.html";</script>');
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (reg_number, password, created_at)
      VALUES ($1, $2, NOW())
    `;
    
    await client.query(query, [regNumber, hashedPassword]);
    res.redirect('/register-success.html');
  } catch (error) {
    if (error.code === '23505') {
      return res.send('<script>alert("Registration number already exists"); window.location="/login.html";</script>');
    }
    console.error('Database error in /api/register:', error.message);
    res.send('<script>alert("Registration failed. Please try again."); window.location="/login.html";</script>');
  } finally {
    client.release();
  }
});

app.post('/api/login', validateInput, async (req, res) => {
  const client = await pool.connect();
  try {
    const { regNumber, password } = req.body;
    
    if (!validator.isAlphanumeric(regNumber)) {
      return res.send('<script>alert("Invalid registration number format"); window.location="/login.html";</script>');
    }
    
    const query = 'SELECT * FROM users WHERE reg_number = $1';
    const result = await client.query(query, [regNumber]);
    
    if (result.rows.length > 0) {
      const isValidPassword = await bcrypt.compare(password, result.rows[0].password);
      if (isValidPassword) {
        res.redirect('/report.html');
      } else {
        res.send('<script>alert("Invalid credentials"); window.location="/login.html";</script>');
      }
    } else {
      res.send('<script>alert("Invalid credentials"); window.location="/login.html";</script>');
    }
  } catch (error) {
    console.error('Database error in /api/login:', error.message);
    res.send('<script>alert("Login failed. Please try again."); window.location="/login.html";</script>');
  } finally {
    client.release();
  }
});

// Initialize database
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
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
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        reg_number VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Critical: Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try {
    await initDB();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
});
