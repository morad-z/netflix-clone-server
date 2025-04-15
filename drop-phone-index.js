// Script to drop the phone index from users collection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix';

async function dropPhoneIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('Dropping phone index from users collection...');
    const result = await mongoose.connection.db.collection('users').dropIndex('phone_1');
    console.log('Index dropped successfully:', result);
  } catch (error) {
    if (error.code === 27) {
      console.log('Index does not exist, nothing to drop');
    } else {
      console.error('Error dropping index:', error);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
dropPhoneIndex();
