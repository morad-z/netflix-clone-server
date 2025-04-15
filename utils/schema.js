import mongoose from 'mongoose';

// ============= Mongoose Schemas =============

// User schema
export const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Profile schema
export const profileSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  userId: { type: Number, required: true },
  avatarUrl: String,
  isKids: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Content schema
export const contentSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true },
  type: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  overview: String,
  posterPath: String,
  backdropPath: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Review schema
export const reviewSchema = new mongoose.Schema({
  profileId: { type: Number, required: true },
  tmdbId: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// MyList schema
export const myListSchema = new mongoose.Schema({
  profileId: { type: Number, required: true },
  tmdbId: { type: Number, required: true },
  type: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  overview: String,
  posterPath: String,
  backdropPath: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  addedAt: { type: Date, default: Date.now }
});

// Log schema
export const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: Number,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

// Create indexes
myListSchema.index({ profileId: 1, tmdbId: 1 }, { unique: true });
contentSchema.index({ tmdbId: 1, type: 1 }, { unique: true });
profileSchema.index({ userId: 1 });
profileSchema.index({ id: 1 }, { unique: true });
reviewSchema.index({ profileId: 1, tmdbId: 1 }, { unique: true });
userSchema.index({ id: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
