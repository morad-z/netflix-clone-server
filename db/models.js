import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { autoIndex: false });

// Remove any existing phone index if it exists
userSchema.index({ phone: 1 }, { unique: false, sparse: true, background: true });

// Use findOneAndUpdate to safely generate sequential IDs
userSchema.pre('save', async function(next) {
  if (!this.id) {
    try {
      // Use findOneAndUpdate to safely get the next ID
      const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      
      this.id = counter.value?.seq || 1;
    } catch (error) {
      console.error('Error generating user ID:', error);
      return next(error);
    }
  }
  next();
});

const profileSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, ref: 'User' },
  name: { type: String, required: true },
  avatarId: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

profileSchema.pre('save', async function(next) {
  if (!this.id) {
    try {
      const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
        { _id: 'profileId' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      this.id = counter.value?.seq || 1;
    } catch (error) {
      console.error('Error generating profile ID:', error);
      return next(error);
    }
  }
  next();
});

const contentSchema = new mongoose.Schema({
  contentId: { type: Number, required: true, unique: true },
  tmdbId: { type: Number, required: true },
  type: { type: String, required: true },
  title: { type: String },
  overview: { type: String },
  posterPath: { type: String },
  backdropPath: { type: String },
  releaseDate: { type: Date },
  voteAverage: { type: Number },
  popularity: { type: Number },
  genreIds: { type: [Number] },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: Number, ref: 'User' }
});

contentSchema.pre('save', async function(next) {
  if (!this.contentId) {
    this.contentId = this.tmdbId;
  }
  next();
});

const reviewSchema = new mongoose.Schema({
  contentId: { type: Number, required: true },
  profileId: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: Number },
  details: String,
  timestamp: { type: Date, default: Date.now }
});

const myListSchema = new mongoose.Schema({
  profileId: { type: Number, required: true },
  contentId: { type: Number, required: true },
  tmdbId: { type: Number, required: true },
  type: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

myListSchema.index({ profileId: 1, contentId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Content = mongoose.model('Content', contentSchema);
const Review = mongoose.model('Review', reviewSchema);
const MyList = mongoose.model('MyList', myListSchema);
const Log = mongoose.model('Log', logSchema);

export { User, Profile, Content, Review, MyList, Log };