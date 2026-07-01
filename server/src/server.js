import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resume.js';
import interviewRoutes from './routes/interview.js';
import reportRoutes from './routes/report.js';

// Load environment variables
dotenv.config();

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

// Connect to MongoDB
connectDB();

const app = express();

// CORS Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Standard parsers
app.use(express.json());
app.use(cookieParser());

// Serve static upload files
app.use('/uploads', express.static('uploads'));

// Base API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/report', reportRoutes);

// Root Health Check Route
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'AI Interview Simulator API is running',
    timestamp: new Date(),
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error Handler Triggered:', err);
  
  const statusCode = err.status || err.statusCode || 500;
  
  return res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred',
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in [${process.env.NODE_ENV}] mode on port ${PORT}`);
});
