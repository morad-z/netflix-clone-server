import { storage } from "../storage.js";

export default function setupMyListRoutes(app) {
  // Middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Get my list for active profile
  app.get("/api/mylist", isAuthenticated, async (req, res, next) => {
    try {
      // Check if there's an active profile in the session
      if (!req.session.activeProfileId) {
        return res.status(200).json([]); // Return empty array instead of error for better UX
      }

      const profileId = req.session.activeProfileId;

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(200).json([]); // Return empty array instead of error
      }

      if (profile.userId !== req.user.id) {
        return res.status(200).json([]); // Return empty array instead of error
      }

      // Get the list items
      const myListItems = await storage.getMyList(profileId);
      res.json(myListItems);
    } catch (error) {
      next(error);
    }
  });

  // Get my list for a profile
  app.get("/api/mylist/:profileId", isAuthenticated, async (req, res, next) => {
    try {
      const profileId = parseInt(req.params.profileId);

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the list items
      const myListItems = await storage.getMyList(profileId);
      res.json(myListItems);
    } catch (error) {
      next(error);
    }
  });

  // Check if item is in list
  app.get("/api/mylist/:profileId/check/:tmdbId", isAuthenticated, async (req, res, next) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const tmdbId = parseInt(req.params.tmdbId);

      // Check if profile exists and belongs to the user
      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if item is in list
      const isInList = await storage.isInMyList(profileId, tmdbId);
      res.json({ inList: isInList });
    } catch (error) {
      next(error);
    }
  });

  // Add item to my list
  app.post("/api/mylist", isAuthenticated, async (req, res, next) => {
    try {
      const myListData = {
        ...req.body,
        profileId: parseInt(req.body.profileId),
        tmdbId: parseInt(req.body.tmdbId)
      };

      // Check if profile exists and belongs to the user  
      const profile = await storage.getProfile(myListData.profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Add to list
      const myListItem = await storage.addToMyList(myListData);

      // Log the action
      await storage.createLog({
        action: "mylist_added",
        userId: req.user.id,
        details: `Profile ${profile.name} added content ${myListData.tmdbId} to their list`,
      });

      res.status(201).json(myListItem);
    } catch (error) {
      if (error.message === "Item already in list") {
        return res.status(400).json({ message: "Content already in list" });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Remove item from my list
  app.delete(
    "/api/mylist/:profileId/:tmdbId",
    isAuthenticated,
    async (req, res, next) => {
      try {
        const profileId = parseInt(req.params.profileId);
        const tmdbId = parseInt(req.params.tmdbId);

        // Check if profile exists and belongs to the user
        const profile = await storage.getProfile(profileId);
        if (!profile) {
          return res.status(404).json({ message: "Profile not found" });
        }

        if (profile.userId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Remove from list
        const success = await storage.removeFromMyList(profileId, tmdbId);
        if (!success) {
          return res.status(404).json({ message: "Item not found in list" });
        }

        // Log the action
        await storage.createLog({
          action: "mylist_removed",
          userId: req.user.id,
          details: `Profile ${profile.name} removed content ${tmdbId} from their list`,
        });

        res.sendStatus(204);
      } catch (error) {
        next(error);
      }
    }
  );
}
