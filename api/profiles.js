import { storage } from "../storage.js";

export default function setupProfileRoutes(app) {
  // Middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Store active profile in session
  app.post("/api/profiles/active", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Setting active profile. Body:", req.body);
      const { profileId } = req.body;

      if (!profileId || typeof profileId !== "number") {
        return res.status(400).json({ message: "Valid profileId is required" });
      }

      // Check if profile exists and belongs to user
      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.userId !== parseInt(req.user.id)) {
        console.log("Access denied. Profile userId:", profile.userId, "User id:", req.user.id);
        return res.status(403).json({ message: "Access denied" });
      }

      // Store active profile in session and save immediately
      req.session.activeProfileId = profileId;

      // Force save the session to ensure it's stored
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return next(err);
        }

        // Log success after session is saved
        console.log("Profile activated and session saved:", {
          profileId,
          sessionId: req.sessionID,
          activeProfileId: req.session.activeProfileId
        });
        res.json({ activeProfileId: profileId, profile });
      });
    } catch (error) {
      console.error("Error in /api/profiles/active:", error);
      next(error);
    }
  });

  // Get active profile
  app.get("/api/profiles/active", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Getting active profile from session:", req.session.activeProfileId);
      const activeProfileId = req.session.activeProfileId;

      if (!activeProfileId) {
        console.log("No active profile found in session");
        return res.status(404).json({ message: "No active profile" });
      }

      const profile = await storage.getProfile(activeProfileId);
      if (!profile) {
        console.log("Profile not found in database:", activeProfileId);
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check if profile belongs to user
      if (profile.userId !== parseInt(req.user.id)) {
        console.log("Profile access denied. Profile userId:", profile.userId, "User id:", req.user.id);
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Returning active profile:", profile);
      res.json({ activeProfile: profile });
    } catch (error) {
      console.error("Error in GET /api/profiles/active:", error);
      next(error);
    }
  });

  // Get all profiles for a user
  app.get("/api/profiles", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Fetching profiles for user ID:", req.user.id);
      
      // Get profiles and handle no results
      const profiles = await storage.getProfilesByUserId(req.user.id) || [];
      
      // Log for debugging
      console.log("Found profiles:", JSON.stringify(profiles));
      
      // Always return an array, even if empty
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      // Send a proper error response
      res.status(500).json({ 
        message: "Failed to fetch profiles",
        error: error.message 
      });
    }
  });

  // Get a specific profile
  app.get("/api/profiles/:id", isAuthenticated, async (req, res, next) => {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Check if profile belongs to user
      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  // Create a new profile
  app.post("/api/profiles", isAuthenticated, async (req, res, next) => {
    try {
      const profileData = {
        ...req.body,
        userId: req.user.id,
      };

      // Create profile
      const profile = await storage.createProfile(profileData);

      // Log the action
      await storage.createLog({
        action: "profile_created",
        userId: req.user.id,
        details: `Created profile "${profile.name}"`,
      });

      res.status(201).json(profile);
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

  // Update a profile
  app.put("/api/profiles/:id", isAuthenticated, async (req, res, next) => {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      // Check if profile exists and belongs to user
      const existingProfile = await storage.getProfile(profileId);
      if (!existingProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (existingProfile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update profile
      const updatedProfile = await storage.updateProfile(profileId, req.body);

      // Log the action
      await storage.createLog({
        action: "profile_updated",
        userId: req.user.id,
        details: `Updated profile "${existingProfile.name}"`,
      });

      res.json(updatedProfile);
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

  // Delete a profile
  app.delete("/api/profiles/:id", isAuthenticated, async (req, res, next) => {
    try {
      const profileId = parseInt(req.params.id);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }

      // Check if profile exists and belongs to user
      const existingProfile = await storage.getProfile(profileId);
      if (!existingProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (existingProfile.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete profile
      await storage.deleteProfile(profileId);

      // Clear active profile if it was the deleted one
      if (req.session.activeProfileId === profileId) {
        req.session.activeProfileId = null;
      }

      // Log the action
      await storage.createLog({
        action: "profile_deleted",
        userId: req.user.id,
        details: `Deleted profile "${existingProfile.name}"`,
      });

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
}
