import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, converted) => {
    delete converted._id;
    delete converted.__v;
  }
});

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MongoDB URI environment variable is not defined');
    }

    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error("MongoDB connection error: " + err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("MongoDB disconnected");
    });

    // Drop old indexes and recreate them
    const MyList = conn.models.MyList;
    if (MyList) {
      try {
        // Drop the old index
        await MyList.collection.dropIndex('profileId_1_contentId_1');
        console.log("Dropped old MyList index");
      } catch (error) {
        // Ignore if index doesn't exist
        if (!error.message.includes('index not found')) {
          console.error("Error dropping old index:", error);
        }
      }

      // Create new index
      await MyList.collection.createIndex(
        { profileId: 1, tmdbId: 1 },
        { unique: true }
      );
      console.log("Created new MyList index");
    }

    return conn;
  } catch (error) {
    console.error("MongoDB connection error: " + error.message);
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1); // Exit if initial connection fails
  }
}