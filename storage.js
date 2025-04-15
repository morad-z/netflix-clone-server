import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from 'express-session';
import MemoryStore from 'memorystore';
import { 
  userSchema, 
  profileSchema, 
  contentSchema, 
  reviewSchema, 
  myListSchema, 
  logSchema 
} from "./utils/schema.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create memory store
const memoryStore = MemoryStore(session);

class Storage {
  constructor() {
    this.sessionStore = new memoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    this.User = mongoose.model('User', userSchema);
    this.Profile = mongoose.model('Profile', profileSchema);
    this.Content = mongoose.model('Content', contentSchema);
    this.Review = mongoose.model('Review', reviewSchema);
    this.MyList = mongoose.model('MyList', myListSchema);
    this.Log = mongoose.model('Log', logSchema);
  }

  // User methods
  async createUser(userData) {
    try {
      // Handle empty phone field to avoid unique index issues
      if (userData.phone === undefined || userData.phone === null || userData.phone === '') {
        // Delete the phone field entirely instead of setting it to null
        delete userData.phone;
      }
      
      // Get the next user ID
      const lastUser = await this.User.findOne().sort({ id: -1 });
      const nextId = (lastUser?.id || 0) + 1;
      
      console.log('Creating user with data:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      const user = new this.User({
        ...userData,
        id: nextId
      });
      await user.save();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    return await this.User.findOne({ username });
  }

  async getUserByEmail(email) {
    return await this.User.findOne({ email });
  }

  async getUserByPhone(phone) {
    return await this.User.findOne({ phone });
  }

  async getUser(id) {
    try {
      console.log('Getting user by ID:', id);
      // Try to find by numeric id first
      let user = await this.User.findOne({ id: parseInt(id) });
      
      if (!user) {
        // If not found, try to find by MongoDB _id
        user = await this.User.findById(id);
      }
      
      console.log('Found user:', user ? user.username : 'not found');
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Profile methods
  async createProfile(profileData) {
    const profile = new this.Profile(profileData);
    await profile.save();
    return profile;
  }

  async getProfiles(userId) {
    return await this.Profile.find({ userId });
  }

  async getProfile(id) {
    return await this.Profile.findOne({ id: parseInt(id) });
  }

  async getProfilesByUserId(userId) {
    try {
      console.log("Storage: Getting profiles for user ID:", userId);
      // First find the user by their numeric ID
      const user = await this.User.findOne({ id: parseInt(userId) });
      if (!user) {
        console.log("Storage: User not found with ID:", userId);
        return [];
      }
      
      const profiles = await this.Profile.find({ userId: parseInt(userId) });
      console.log("Storage: Found profiles:", JSON.stringify(profiles));
      return profiles || [];
    } catch (error) {
      console.error("Storage: Error getting profiles:", error);
      return [];
    }
  }

  async createProfile(insertProfile) {
    try {
      // Get the last profile to determine next ID
      const lastProfile = await this.Profile.findOne().sort({ id: -1 });
      const nextId = (lastProfile?.id || 0) + 1;

      const profile = new this.Profile({
        ...insertProfile,
        id: nextId,
        createdAt: new Date()
      });
      
      return await profile.save();
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async updateProfile(id, name) {
    return await this.Profile.findOneAndUpdate({ id: parseInt(id) }, { name }, { new: true });
  }

  async deleteProfile(id) {
    return await this.Profile.findOneAndDelete({ id: parseInt(id) });
  }

  // Content operations
  async getContent(contentId) {
    return await this.Content.findOne({ 
      $or: [
        { contentId: Number(contentId) },
        { tmdbId: Number(contentId) }
      ]
    });
  }

  async getContentByTmdbId(tmdbId, type) {
    try {
      return await this.Content.findOne({ 
        tmdbId: parseInt(tmdbId), 
        type 
      });
    } catch (error) {
      console.error("Error in getContentByTmdbId:", error);
      throw error;
    }
  }

  async getMostViewedContent() {
    try {
      // Get all content and sort by views
      const content = await this.Content.find()
        .sort({ views: -1 })
        .limit(10);
      return content;
    } catch (error) {
      console.error("Error in getMostViewedContent:", error);
      return [];
    }
  }

  async getContentByType(type) {
    try {
      return await this.Content.find({ type });
    } catch (error) {
      console.error("Error in getContentByType:", error);
      throw error;
    }
  }

  async createContent(contentData) {
    try {
      const content = new this.Content({
        ...contentData,
        tmdbId: parseInt(contentData.tmdbId)
      });
      await content.save();
      return content;
    } catch (error) {
      console.error("Error in createContent:", error);
      throw error;
    }
  }

  async getAllContent(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await this.Content.find().skip(skip).limit(limit);
  }

  async getContentByType(type, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await this.Content.find({ type }).skip(skip).limit(limit);
  }

  async getLatestContent(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await this.Content.find().sort({ addedAt: -1 }).skip(skip).limit(limit);
  }

  // Review operations
  async getReview(reviewId) {
    try {
      return await this.Review.findOne({ _id: reviewId });
    } catch (error) {
      console.error("Error in getReview:", error);
      throw error;
    }
  }

  async getReviewsByProfileId(profileId) {
    try {
      return await this.Review.find({ profileId: parseInt(profileId) });
    } catch (error) {
      console.error("Error in getReviewsByProfileId:", error);
      throw error;
    }
  }

  async getReviewsByTmdbId(tmdbId) {
    try {
      return await this.Review.find({ tmdbId: parseInt(tmdbId) });
    } catch (error) {
      console.error("Error in getReviewsByTmdbId:", error);
      throw error;
    }
  }

  async getReviewsByContentId(contentId) {
    try {
      // First get content by ID to get its tmdbId
      const content = await this.Content.findById(contentId);
      if (!content) {
        return [];
      }
      // Then get all reviews for that tmdbId
      return await this.Review.find({ tmdbId: content.tmdbId })
        .populate('profileId', 'name avatar')
        .sort({ createdAt: -1 });
    } catch (error) {
      // If the contentId is invalid (not a valid ObjectId), return empty array
      if (error.name === 'CastError' && error.path === '_id') {
        return [];
      }
      console.error("Error in getReviewsByContentId:", error);
      throw error;
    }
  }

  async getReviewByProfileAndContent(profileId, tmdbId) {
    try {
      return await this.Review.findOne({
        profileId: parseInt(profileId),
        tmdbId: parseInt(tmdbId)
      });
    } catch (error) {
      console.error("Error in getReviewByProfileAndContent:", error);
      throw error;
    }
  }

  async createReview(reviewData) {
    try {
      const review = new this.Review({
        ...reviewData,
        profileId: parseInt(reviewData.profileId),
        tmdbId: parseInt(reviewData.tmdbId),
        rating: parseInt(reviewData.rating)
      });
      await review.save();
      return review;
    } catch (error) {
      console.error("Error in createReview:", error);
      throw error;
    }
  }

  async updateReview(reviewId, reviewData) {
    try {
      const review = await this.Review.findById(reviewId);
      if (!review) {
        return null;
      }

      Object.assign(review, {
        ...reviewData,
        rating: parseInt(reviewData.rating),
        updatedAt: new Date()
      });

      await review.save();
      return review;
    } catch (error) {
      console.error("Error in updateReview:", error);
      throw error;
    }
  }

  async deleteReview(reviewId) {
    try {
      const result = await this.Review.deleteOne({ _id: reviewId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error in deleteReview:", error);
      throw error;
    }
  }

  // My List operations
  async isInMyList(profileId, tmdbId) {
    try {
      const myListItem = await this.MyList.findOne({
        profileId: parseInt(profileId),
        tmdbId: parseInt(tmdbId)
      });
      return !!myListItem;
    } catch (error) {
      console.error("Error in isInMyList:", error);
      throw error;
    }
  }

  async addToMyList(myListData) {
    try {
      // Convert IDs to numbers
      const data = {
        ...myListData,
        profileId: parseInt(myListData.profileId),
        tmdbId: parseInt(myListData.tmdbId)
      };

      // Check if item already exists
      const existingItem = await this.MyList.findOne({
        profileId: data.profileId,
        tmdbId: data.tmdbId
      });

      if (existingItem) {
        throw new Error("Item already in list");
      }

      // Create new item
      const myListItem = new this.MyList(data);
      await myListItem.save();
      return myListItem;
    } catch (error) {
      console.error("Error in addToMyList:", error);
      throw error;
    }
  }

  async removeFromMyList(profileId, tmdbId) {
    try {
      const result = await this.MyList.deleteOne({
        profileId: parseInt(profileId),
        tmdbId: parseInt(tmdbId)
      });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error in removeFromMyList:", error);
      throw error;
    }
  }

  async getMyList(profileId) {
    try {
      return await this.MyList.find({ 
        profileId: parseInt(profileId) 
      });
    } catch (error) {
      console.error("Error in getMyList:", error);
      throw error;
    }
  }

  // Admin operations
  async getLogs(page = 1, limit = 20) {
    const logs = await this.Log.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return logs;
  }

  async getStats() {
    const users = await this.User.countDocuments();
    const content = await this.Content.countDocuments();
    const reviews = await this.Review.countDocuments();
    return {
      totalUsers: users,
      totalContent: content,
      totalReviews: reviews
    };
  }

  async createLog(logData) {
    const log = new this.Log({
      action: logData.action,
      userId: logData.userId,
      details: logData.details,
      timestamp: new Date()
    });
    return await log.save();
  }
}

const storage = new Storage();
export { storage };