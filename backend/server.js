const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create Database Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Database Connection
app.get('/api/test-db', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        res.json({ success: true, message: 'Successfully connected to MySQL database!' });
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ success: false, message: 'Database connection failed', error: error.message });
    }
});

// Parking Areas Route
app.get('/api/parking_areas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM parking_areas');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Failed to fetch parking areas:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch parking areas', error: error.message });
    }
});

// Bookings Route (Save)
app.post('/api/bookings', async (req, res) => {
    try {
        const { id, facilityName, slotId, startTime, endTime, vehicleId, createdAt } = req.body;
        const [result] = await pool.query(
            'INSERT INTO bookings (id, facilityName, slotId, startTime, endTime, vehicleId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, facilityName, slotId, new Date(startTime), new Date(endTime), vehicleId, new Date(createdAt)]
        );
        res.json({ success: true, message: 'Booking saved successfully', data: result });
    } catch (error) {
        console.error('Failed to save booking:', error);
        res.status(500).json({ success: false, message: 'Failed to save booking', error: error.message });
    }
});

// Bookings Route (Get)
app.get('/api/bookings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM bookings');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the PARKIT Backend API' });
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`To test the database connection, visit: http://localhost:${port}/api/test-db`);
});
