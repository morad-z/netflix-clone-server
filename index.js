import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToMongoDB } from './db/mongodb.js';
import { setupAuth } from './auth.js';
import setupContentRoutes from './api/content.js';
import setupProfileRoutes from './api/profiles.js';
import setupReviewRoutes from './api/reviews.js';
import setupMyListRoutes from './api/mylist.js';
import { setupAdminRoutes } from './api/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize passport and auth
setupAuth(app);

// Connect to MongoDB
(async () => {
  await connectToMongoDB();

  // Setup routes
  setupContentRoutes(app);
  setupProfileRoutes(app);
  setupReviewRoutes(app);
  setupMyListRoutes(app);
  setupAdminRoutes(app);

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Start server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
