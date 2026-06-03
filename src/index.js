import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module setup for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables using absolute path to ensure it finds .env
// even if the server is started from a parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { upload } from './middlewares/upload.js';
import { ImageRecord } from './models/ImageRecord.js';
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "https://smart-hire-malawi-app.vercel.app",
  credentials: true
}));
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check endpoint (used by keep-alive ping)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test email endpoint — visit /api/test-email?to=your@email.com to verify SMTP works
app.get('/api/test-email', async (req, res) => {
  const { sendOTPEmail } = await import('./utils/emailUtils.js');
  const to = req.query.to;
  if (!to) return res.status(400).json({ error: 'Provide ?to=your@email.com' });
  const result = await sendOTPEmail(to, '123456');
  if (result) {
    res.json({ success: true, message: `Test email sent to ${to}` });
  } else {
    res.status(500).json({ success: false, message: 'Email failed — check Render logs for details' });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('Job Vacancy API is running...');
});
// App Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Example route to verify the API is running
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Job Vacancy Backend API!' });
});

// Example route for uploading an image and saving to MongoDB
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
       res.status(400).json({ error: 'No image file provided' });
       return;
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const newImageRecord = new ImageRecord({
      filename: req.file.filename,
      url: imageUrl
    });
    
    await newImageRecord.save();

    res.status(201).json({
      message: 'Image uploaded successfully!',
      file: req.file,
      record: newImageRecord
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});
// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-vacancy');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);

      // Self-ping every 14 minutes to prevent Render free tier from sleeping
      const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
      setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/health`);
          console.log(`[Keep-Alive] Ping sent at ${new Date().toISOString()} — status: ${res.status}`);
        } catch (err) {
          console.warn(`[Keep-Alive] Ping failed: ${err.message}`);
        }
      }, 14 * 60 * 1000); // every 14 minutes
    });
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ MONGODB CONNECTION ERROR ❌');
    console.error(error);
    process.exit(1);
  }
};

connectDB();
