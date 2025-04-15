import { storage } from "../storage.js";
import { CONTENT_TYPES } from "../constants.js";

export default function setupReviewRoutes(app) {
  // Middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Get all reviews for a content item
  app.get(
    "/api/reviews/content/:contentId",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const contentId = req.params.contentId;

        // Get all reviews for this content
        const reviews = await storage.getReviewsByContentId(contentId);

        // Filter out private reviews that don't belong to the current user's profiles
        const userProfiles = await storage.getProfilesByUserId(req.user.id);
        const userProfileIds = userProfiles.map((profile) => profile.id);

        const filteredReviews = reviews.filter(
          (review) =>
            review.isPublic || userProfileIds.includes(review.profileId)
        );

        res.json(filteredReviews);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get all reviews by a profile
  app.get(
    "/api/reviews/profile/:profileId",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const profileId = parseInt(req.params.profileId);
        if (isNaN(profileId)) {
          return res.status(400).json({ message: "Invalid profile ID" });
        }

        // Check if profile exists and belongs to the user
        const profile = await storage.getProfile(profileId);
        if (!profile) {
          return res.status(404).json({ message: "Profile not found" });
        }

        if (profile.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get all reviews by this profile
        const reviews = await storage.getReviewsByProfileId(profileId);
        res.json(reviews);
      } catch (error) {
        next(error);
      }
    }
  );

  // Create a new review
  app.post("/api/reviews", isAuthenticated, async (req, res, next) => {
    try {
      // Validate required fields
      const { tmdbId, profileId, type, rating } = req.body;
      if (!tmdbId || !profileId || !type || !rating) {
        return res.status(400).json({ 
          message: "Missing required fields",
          required: ["tmdbId", "profileId", "type", "rating"]
        });
      }

      // Validate content type
      if (!Object.values(CONTENT_TYPES).includes(type)) {
        return res.status(400).json({ 
          message: "Invalid content type",
          validTypes: Object.values(CONTENT_TYPES)
        });
      }

      // Validate rating
      const numericRating = parseInt(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ 
          message: "Rating must be between 1 and 5" 
        });
      }

      const reviewData = {
        ...req.body,
        profileId: parseInt(profileId),
        tmdbId: parseInt(tmdbId),
        rating: numericRating
      };

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(reviewData.profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if user already reviewed this content
      const existingReview = await storage.getReviewByProfileAndContent(
        reviewData.profileId,
        reviewData.tmdbId
      );

      if (existingReview) {
        return res.status(400).json({ 
          message: "You have already reviewed this content",
          reviewId: existingReview._id
        });
      }

      // Get content or create if doesn't exist
      let content = await storage.getContentByTmdbId(reviewData.tmdbId, type);
      
      if (!content) {
        console.log("Content not found, fetching from TMDb:", reviewData.tmdbId);
        const { getMovieDetails, getTVDetails } = await import('../services/tmdb.js');
        
        try {
          const tmdbDetails = type === CONTENT_TYPES.MOVIE 
            ? await getMovieDetails(reviewData.tmdbId)
            : await getTVDetails(reviewData.tmdbId);

          console.log("TMDb details:", tmdbDetails);
          const contentData = {
            tmdbId: reviewData.tmdbId,
            type: type,
            title: tmdbDetails.title || tmdbDetails.name,
            overview: tmdbDetails.overview,
            posterPath: tmdbDetails.poster_path,
            backdropPath: tmdbDetails.backdrop_path
          };
          content = await storage.createContent(contentData);
          console.log("Created new content:", content);
        } catch (error) {
          console.error('TMDb API error:', error);
          return res.status(500).json({ message: "Failed to fetch content details" });
        }
      }

      // Create review
      const review = await storage.createReview(reviewData);

      // Log the action
      await storage.createLog({
        action: "review_created",
        userId: req.user.id,
        details: `Profile ${profile.name} reviewed ${type} ${reviewData.tmdbId}`,
      });

      res.status(201).json(review);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Update a review
  app.put("/api/reviews/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reviewId = req.params.id;

      // Validate rating if provided
      const { rating } = req.body;
      if (rating !== undefined) {
        const numericRating = parseInt(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
          return res.status(400).json({ 
            message: "Rating must be between 1 and 5" 
          });
        }
        req.body.rating = numericRating;
      }

      // Get the review
      const review = await storage.getReview(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(review.profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update review
      const updatedReview = await storage.updateReview(reviewId, req.body);
      if (!updatedReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Log the action
      await storage.createLog({
        action: "review_updated",
        userId: req.user.id,
        details: `Profile ${profile.name} updated review ${reviewId}`,
      });

      res.json(updatedReview);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Delete a review
  app.delete("/api/reviews/:id", isAuthenticated, async (req, res, next) => {
    try {
      const reviewId = req.params.id;

      // Get the review
      const review = await storage.getReview(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(review.profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete review
      const success = await storage.deleteReview(reviewId);
      if (!success) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Log the action
      await storage.createLog({
        action: "review_deleted",
        userId: req.user.id,
        details: `Profile ${profile.name} deleted review ${reviewId}`,
      });

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
}
