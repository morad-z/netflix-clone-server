import { storage } from "../storage.js";
import { getMovieDetails, getTVDetails } from "../services/tmdb.js";

export function setupAdminRoutes(app) {
  // Middleware to check authentication and admin status
  const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  };

  // Get system logs
  app.get("/api/admin/logs", isAdmin, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;

      const logs = await storage.getLogs(page, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Add content to the system
  app.post("/api/admin/content", isAdmin, async (req, res, next) => {
    try {
      const { tmdbId, type } = req.body;

      if (!tmdbId || !type || (type !== "movie" && type !== "tv")) {
        return res
          .status(400)
          .json({ message: "Valid TMDb ID and type (movie or tv) required" });
      }

      // Check if already exists
      const existingContent = await storage.getContentByTmdbId(tmdbId);
      if (existingContent) {
        return res
          .status(400)
          .json({ message: "Content already exists in the system" });
      }

      // Verify content exists in TMDb
      let details;
      try {
        if (type === "movie") {
          details = await getMovieDetails(tmdbId);
        } else {
          details = await getTVDetails(tmdbId);
        }
      } catch (error) {
        return res.status(404).json({ message: "Content not found in TMDb" });
      }

      // Add to our database
      const contentData = {
        tmdbId,
        type,
        title: details.title || details.name,
        overview: details.overview,
        posterPath: details.poster_path,
        backdropPath: details.backdrop_path,
        addedBy: req.user.id,
      };

      // Create content
      const content = await storage.createContent(contentData);

      // Log the action
      await storage.createLog({
        action: "content_added",
        userId: req.user.id,
        details: `Added ${type} with TMDb ID ${tmdbId}: ${
          details.title || details.name
        }`,
      });

      // Return with details
      res.status(201).json({
        ...content,
        details,
      });
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

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res, next) => {
    try {
      const users = await storage.User.find({}, { password: 0 });
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", isAdmin, async (req, res, next) => {
    try {
      const stats = await storage.getStats();
      const logs = await storage.getLogs(1, 5);

      // Get all users for log details
      const usersList = await storage.User.find({}, 'id username').lean();
      const usersMap = usersList.reduce((acc, user) => {
        acc[user.id] = user.username;
        return acc;
      }, {});

      // Enhance logs with usernames
      const logsWithUsernames = logs.map(log => ({
        ...log,
        username: log.userId ? usersMap[log.userId] : 'System',
        timestamp: new Date(log.timestamp).toLocaleString()
      }));

      res.json({
        ...stats,
        recentActivity: logsWithUsernames
      });
    } catch (error) {
      next(error);
    }
  });
}
