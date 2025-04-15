// Script to fix MongoDB index issues
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connection URI from environment or default
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix';
const dbName = uri.split('/').pop();

async function fixDatabase() {
  const client = new MongoClient(uri);
  
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to MongoDB server');
    
    // Get database and users collection
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // List all indexes
    console.log('Current indexes:');
    const indexes = await usersCollection.indexes();
    console.log(indexes);
    
    // Drop the problematic phone index if it exists
    try {
      await usersCollection.dropIndex('phone_1');
      console.log('Successfully dropped phone_1 index');
    } catch (error) {
      console.log('Error dropping index:', error.message);
    }
    
    // Create a new sparse index (not unique)
    try {
      await usersCollection.createIndex({ phone: 1 }, { 
        sparse: true, 
        unique: false,
        name: 'phone_1_sparse'
      });
      console.log('Created new sparse, non-unique index on phone field');
    } catch (error) {
      console.log('Error creating new index:', error.message);
    }
    
    // List indexes again to confirm changes
    console.log('\nUpdated indexes:');
    const updatedIndexes = await usersCollection.indexes();
    console.log(updatedIndexes);
    
    console.log('\nDatabase fix completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fixDatabase();
