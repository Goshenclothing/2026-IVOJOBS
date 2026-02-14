const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');

dotenv.config();

const app = express();

// Mock Data Initialization
const mockJobs = [
  { _id: '1', title: 'Senior Developer', company: 'TechCorp', description: 'React & Node.js expert needed.', location: 'Remote', salary: '$120k', createdAt: new Date() },
  { _id: '2', title: 'UI/UX Designer', company: 'CreativeStudio', description: 'Design beautiful interfaces.', location: 'New York', salary: '$90k', createdAt: new Date() }
];
const mockUsers = [
  { _id: '1', name: 'John Doe', headline: 'Full Stack Developer', company: 'Google', skills: ['React', 'Node.js', 'MongoDB'], avatar: 'https://placehold.co/120x120/0d47a1/ffffff?text=J', createdAt: new Date() },
  { _id: '2', name: 'Jane Smith', headline: 'Product Designer', company: 'Apple', skills: ['Figma', 'Sketch', 'UI/UX'], avatar: 'https://placehold.co/120x120/0d47a1/ffffff?text=J', createdAt: new Date() }
];

app.locals.mockJobs = mockJobs;
app.locals.mockUsers = mockUsers;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://placehold.co", "https://www.google-analytics.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"], 
    },
  },
})); 
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 100;

app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, startTime: now });
  } else {
    const data = rateLimit.get(ip);
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      data.count = 1;
      data.startTime = now;
    } else {
      data.count++;
      if (data.count > MAX_REQUESTS) {
        return res.status(429).json({ message: 'Too many requests, please try again later.' });
      }
    }
  }
  next();
});

// Input Sanitization
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                                     .replace(/on\w+="[^"]*"/g, ""); 
      }
    }
  }
  next();
});

// Database Connection
let isUsingMockDB = false;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ivojobs';

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.set('isUsingMockDB', false);
  })
  .catch(err => {
    console.error('❌ Could not connect to MongoDB:', err.message);
    console.error('Switching to IN-MEMORY MOCK MODE.');
    app.set('isUsingMockDB', true);
  });

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const jobRoutes = require('./routes/jobs');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date(), mode: app.get('isUsingMockDB') ? 'memory' : 'mongo' });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API Endpoint Not Found' });
});

app.use(express.static(path.join(__dirname, '../')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});