import { createServer } from "http";
import { setupAuth } from "./auth.js";
import { setupProfileRoutes } from "./api/profiles.js";
import { setupContentRoutes } from "./api/content.js";
import { setupReviewRoutes } from "./api/reviews.js";
import { setupMyListRoutes } from "./api/mylist.js";
import { setupAdminRoutes } from "./api/admin.js";

export async function registerRoutes(app) {
  // Set up authentication (JWT)
  setupAuth(app);
  
  // Set up API routes
  setupProfileRoutes(app);
  setupContentRoutes(app);
  setupReviewRoutes(app);
  setupMyListRoutes(app);
  setupAdminRoutes(app);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
