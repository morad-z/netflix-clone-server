import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Use environment variable
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// Fetch trending movies
export async function fetchTrendingMovies(page = 1) {
  const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results;
}

// Fetch trending TV shows
export async function fetchTrendingTVShows(page = 1) {
  const url = `${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results;
}

// Get movie details
export async function getMovieDetails(id) {
  const url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=credits,videos,images,similar`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

// Get TV show details
export async function getTVDetails(id) {
  const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=credits,videos,images,similar,seasons`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

// Search for movies and TV shows
export async function searchMoviesAndShows(query, options = {}) {
  const { page = 1, language, genre, year } = options;

  // If genre is specified, use discover endpoints
  if (genre && genre !== 'all') {
    const [movies, shows] = await Promise.all([
      fetchMoviesByGenre(genre, page),
      fetchTVShowsByGenre(genre, page)
    ]);
    return [...movies, ...shows];
  }

  // Otherwise use regular search
  let queryParams = `query=${encodeURIComponent(query)}&page=${page}`;

  if (language) {
    queryParams += `&with_original_language=${language}`;
  }

  if (year) {
    queryParams += `&primary_release_year=${year}`;
  }

  const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&${queryParams}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results;
}

// Fetch movies by genre
export async function fetchMoviesByGenre(genreId, page = 1) {
  const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results;
}

// Fetch TV shows by genre
export async function fetchTVShowsByGenre(genreId, page = 1) {
  const url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDb API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results;
}
