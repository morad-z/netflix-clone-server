import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './db/models.js';

// Load environment variables
dotenv.config();

// Connection URI from environment or default
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix';

async function resetUserSchema() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Drop the User collection to remove all indexes
    console.log('Dropping User collection...');
    try {
      await mongoose.connection.db.dropCollection('users');
      console.log('User collection dropped successfully');
    } catch (error) {
      console.log('Error dropping collection:', error.message);
    }
    
    // Create a new user schema without the phone index
    console.log('Creating new User schema...');
    
    // Create a new user to ensure the collection and indexes are created
    const testUser = new User({
      username: 'test_admin',
      email: 'admin@example.com',
      password: 'hashed_password_here',
      isAdmin: true
    });
    
    await testUser.save();
    console.log('Test user created successfully');
    
    // Delete the test user
    await User.deleteOne({ username: 'test_admin' });
    console.log('Test user deleted');
    
    console.log('User schema reset successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
resetUserSchema();
