import { storage } from "../storage.js";
import {
  fetchTrendingMovies,
  fetchTrendingTVShows,
  searchMoviesAndShows,
  getMovieDetails,
  getTVDetails,
} from "../services/tmdb.js";

// Helper function to save a TMDB item to our database
async function saveContentToDb(item, type) {
  try {
    // Check if content already exists in our db by TMDB ID
    const existingContent = await storage.getContentByTmdbId(item.id, type);
    if (existingContent) {
      return existingContent; // Already exists, return it
    }

    // Prepare content data
    const contentData = {
      tmdbId: item.id,
      type,
      title: item.title || item.name,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      releaseDate: item.release_date || item.first_air_date,
      voteAverage: item.vote_average || 0,
      popularity: item.popularity || 0,
      genreIds: JSON.stringify(item.genre_ids || []),
      additionalData: JSON.stringify({
        media_type: type,
        ...item,
      }),
    };

    // Save to database
    const savedContent = await storage.createContent(contentData);

    // Return saved content
    return savedContent;
  } catch (error) {
    console.error("Error saving content to database:", error);
    throw error;
  }
}

export function setupContentRoutes(app) {
  // Middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Get newest content
  app.get("/api/content/newest", isAuthenticated, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      // Fetch from TMDb and map to our content
      const [trendingMovies, trendingTVShows] = await Promise.all([
        fetchTrendingMovies(),
        fetchTrendingTVShows(),
      ]);

      // Combine and sort by release date
      const allContent = [...trendingMovies, ...trendingTVShows]
        .sort(
          (a, b) =>
            new Date(b.release_date || b.first_air_date || "").getTime() -
            new Date(a.release_date || a.first_air_date || "").getTime()
        )
        .slice(0, limit);

      res.json(allContent);
    } catch (error) {
      next(error);
    }
  });

  // Get most popular content
  app.get("/api/content/popular", isAuthenticated, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      // Fetch from TMDb and map to our content
      const [trendingMovies, trendingTVShows] = await Promise.all([
        fetchTrendingMovies(),
        fetchTrendingTVShows(),
      ]);

      // Combine and sort by popularity
      const allContent = [...trendingMovies, ...trendingTVShows]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);

      res.json(allContent);
    } catch (error) {
      next(error);
    }
  });

  // Get movies
  app.get("/api/content/movies", isAuthenticated, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;

      // Fetch trending movies from TMDb
      const movies = await fetchTrendingMovies(page);

      res.json(movies.slice(0, limit));
    } catch (error) {
      next(error);
    }
  });

  // Get TV shows
  app.get("/api/content/tvshows", isAuthenticated, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;

      // Fetch trending TV shows from TMDb
      const tvShows = await fetchTrendingTVShows(page);

      res.json(tvShows.slice(0, limit));
    } catch (error) {
      next(error);
    }
  });

  // Create content (from client-side data)
  app.post("/api/content", isAuthenticated, async (req, res, next) => {
    try {
      const contentData = {
        ...req.body,
        tmdbId: parseInt(req.body.tmdbId)
      };

      const content = await storage.createContent(contentData);
      res.status(201).json(content);
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

  // Get content details
  app.get("/api/content/:type/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const type = req.params.type;

      if (type !== "movie" && type !== "tv") {
        return res.status(400).json({ message: "Invalid content type" });
      }

      // Fetch details from TMDb
      let details;
      if (type === "movie") {
        details = await getMovieDetails(id);
      } else {
        details = await getTVDetails(id);
      }

      // Check if content exists in our database
      let content = await storage.getContentByTmdbId(id, type);

      // If content doesn't exist, create it
      if (!content) {
        const contentData = {
          tmdbId: id,
          type,
          title: details.title || details.name,
          overview: details.overview,
          posterPath: details.poster_path,
          backdropPath: details.backdrop_path,
          releaseDate: details.release_date || details.first_air_date,
          voteAverage: details.vote_average || 0,
          popularity: details.popularity || 0,
          genreIds: details.genre_ids || details.genres?.map(g => g.id) || [],
          additionalData: JSON.stringify({
            media_type: type,
            ...details,
          }),
        };
        content = await storage.createContent(contentData);
      }

      // Return both TMDb details and our content record
      res.json({
        ...details,
        contentId: content.id,
      });
    } catch (error) {
      next(error);
    }
  });

  // Search for content
  app.get("/api/content/search", isAuthenticated, async (req, res, next) => {
    try {
      const { q: query, page = 1, language, genre, year } = req.query;

      // Allow searching by genre without requiring a query
      if (genre && genre !== 'all') {
        try {
          const results = await searchMoviesAndShows('', {
            page: parseInt(page),
            genre,
            language,
            year
          });
          if (!results || results.length === 0) {
            return res.json([]);
          }
          return res.json(results);
        } catch (error) {
          console.error('Error searching by genre:', error);
          return res.status(500).json({ message: "Error fetching genre content" });
        }
      }

      // Require query if no genre specified
      if (!query) {
        return res
          .status(400)
          .json({ message: "Search query is required when not filtering by genre" });
      }

      // Search using TMDb API
      const results = await searchMoviesAndShows(query || "*", {
        page: parseInt(page),
        language,
        genre,
        year,
      });

      res.json(results);
    } catch (error) {
      next(error);
    }
  });

  // Get content by TMDB ID
  app.get("/api/content/:type/:tmdbId", async (req, res, next) => {
    try {
      const { type, tmdbId } = req.params;

      // Validate type
      if (!['movie', 'tv'].includes(type)) {
        return res.status(400).json({ error: "Invalid content type" });
      }

      // Parse tmdbId as number
      const parsedTmdbId = parseInt(tmdbId);
      if (isNaN(parsedTmdbId)) {
        return res.status(400).json({ error: "Invalid TMDb ID" });
      }

      // Try to find existing content
      let content = await storage.getContentByTmdbId(parsedTmdbId, type);

      // If not found, create it
      if (!content) {
        // Get content from TMDb
        let details;
        if (type === "movie") {
          details = await getMovieDetails(parsedTmdbId);
        } else {
          details = await getTVDetails(parsedTmdbId);
        }
        if (!details) {
          return res.status(404).json({ error: "Content not found" });
        }

        // Create content in our database
        const contentData = {
          tmdbId: parsedTmdbId,
          type,
          title: details.title || details.name,
          overview: details.overview,
          posterPath: details.poster_path,
          backdropPath: details.backdrop_path,
          releaseDate: details.release_date || details.first_air_date,
          voteAverage: details.vote_average || 0,
          popularity: details.popularity || 0,
          genreIds: details.genre_ids || details.genres?.map(g => g.id) || [],
          additionalData: JSON.stringify({
            media_type: type,
            ...details,
          }),
        };
        content = await storage.createContent(contentData);
      }

      res.json(content);
    } catch (error) {
      console.error("Error getting content:", error);
      res.status(500).json({ error: "Something went wrong!", message: error.message, stack: error.stack });
    }
  });

  // Get content by ID
  app.get("/api/content/:id", async (req, res, next) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      next(error);
    }
  });

  // Update content
  app.put("/api/content/:id", isAuthenticated, async (req, res, next) => {
    try {
      const contentData = {
        ...req.body,
        tmdbId: parseInt(req.body.tmdbId)
      };

      const content = await storage.updateContent(req.params.id, contentData);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
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

  // Delete content
  app.delete("/api/content/:id", isAuthenticated, async (req, res, next) => {
    try {
      const success = await storage.deleteContent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
}

export default setupContentRoutes;
