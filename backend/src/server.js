const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const logger = require('./logger');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Validation schema
const studentSchema = Joi.object({
  student_id: Joi.string().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  department: Joi.string().required(),
  enrollment_year: Joi.number().integer().min(2000).max(2024).required()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Create student
app.post('/api/students', async (req, res) => {
  try {
    // Validate input
    const { error, value } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Insert into database
    const query = `
      INSERT INTO students (student_id, name, email, password, department, enrollment_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, student_id, name, email, department, enrollment_year, created_at
    `;
    
    const result = await pool.query(query, [
      value.student_id,
      value.name,
      value.email,
      hashedPassword,
      value.department,
      value.enrollment_year
    ]);

    logger.info(`Student created: ${value.student_id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, name, email, department, enrollment_year, created_at FROM students ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
app.get('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const result = await pool.query(
      'SELECT id, student_id, name, email, department, enrollment_year, created_at FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
app.put('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { name, email, department, enrollment_year } = req.body;

    const result = await pool.query(
      `UPDATE students 
       SET name = $1, email = $2, department = $3, enrollment_year = $4, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $5
       RETURNING id, student_id, name, email, department, enrollment_year, created_at`,
      [name, email, department, enrollment_year, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
app.delete('/api/students/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE student_id = $1 RETURNING id', [student_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});