import {
  getMovieDetails,
  getTVDetails,
  fetchMoviesByGenre,
  fetchTVShowsByGenre,
} from "./tmdb.js";

// This is a simplified recommendation engine
// In a real-world scenario, you'd use a more sophisticated machine learning library
// For simplicity, we'll use a collaborative filtering approach based on genres and ratings

// Function to get recommendations based on user reviews
export async function getRecommendations(reviews, limit = 10) {
  if (reviews.length === 0) {
    // If no reviews, return general trending content
    return [];
  }

  // Step 1: Map reviews to content and ratings
  const contentRatings = [];

  for (const review of reviews) {
    try {
      const content = await getContent(review.contentId);
      if (!content) continue;

      // Fetch detailed content info from TMDb
      let details;
      try {
        if (content.type === "movie") {
          details = await getMovieDetails(content.tmdbId);
        } else {
          details = await getTVDetails(content.tmdbId);
        }

        contentRatings.push({
          contentId: content.id,
          tmdbId: content.tmdbId,
          type: content.type,
          rating: review.rating || 0,
          genres: details.genres || [],
        });
      } catch (error) {
        console.error("Error fetching content details:", error);
      }
    } catch (error) {
      console.error("Error in recommendation engine:", error);
    }
  }

  // Step 2: Find preferred genres (weighted by ratings)
  const genreWeights = new Map();

  for (const content of contentRatings) {
    const rating = content.rating || 3; // Default to neutral if no rating

    for (const genre of content.genres) {
      const currentWeight = genreWeights.get(genre.id);
      if (currentWeight) {
        genreWeights.set(genre.id, {
          weight: currentWeight.weight + rating,
          count: currentWeight.count + 1,
        });
      } else {
        genreWeights.set(genre.id, { weight: rating, count: 1 });
      }
    }
  }

  // Calculate average weight per genre
  const genreAvgWeights = Array.from(genreWeights.entries()).map(
    ([genreId, data]) => ({
      genreId,
      avgWeight: data.weight / data.count,
    })
  );

  // Sort by average weight
  genreAvgWeights.sort((a, b) => b.avgWeight - a.avgWeight);

  // Step 3: Get top genres and fetch recommendations
  const topGenres = genreAvgWeights.slice(0, 3).map((g) => g.genreId);

  if (topGenres.length === 0) {
    return [];
  }

  // Fetch recommendations for top genres
  const recommendations = [];

  // Balance between movies and TV shows
  for (const genreId of topGenres) {
    try {
      const [movies, tvShows] = await Promise.all([
        fetchMoviesByGenre(genreId),
        fetchTVShowsByGenre(genreId),
      ]);

      // Add to recommendations, alternate between movies and TV shows
      const max = Math.min(movies.length, tvShows.length, 5); // Limit per genre
      for (let i = 0; i < max; i++) {
        if (movies[i]) recommendations.push(movies[i]);
        if (tvShows[i]) recommendations.push(tvShows[i]);
      }
    } catch (error) {
      console.error("Error fetching genre recommendations:", error);
    }
  }

  // Filter out content the user has already reviewed
  const reviewedTmdbIds = new Set(contentRatings.map((c) => c.tmdbId));
  const filteredRecommendations = recommendations.filter(
    (r) => !reviewedTmdbIds.has(r.id)
  );

  // Return unique recommendations up to the limit
  const uniqueRecommendations = Array.from(
    new Map(filteredRecommendations.map((item) => [item.id, item])).values()
  ).slice(0, limit);

  return uniqueRecommendations;
}

// Helper function to get content by ID
async function getContent(contentId) {
  // This would normally be a database query
  // In this simplified version, we assume we have these methods available
  return {
    id: contentId,
    tmdbId: contentId, // In a real implementation, this would be the actual TMDb ID
    type: Math.random() > 0.5 ? "movie" : "tv", // Random type for demo
    addedAt: new Date(),
    addedBy: 1,
  };
}
