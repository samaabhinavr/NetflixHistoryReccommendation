import { supabase } from "@/lib/supabase";
import type { MovieMetadata } from "@/lib/supabase";

export async function fetchUserMetadata(userId: string): Promise<MovieMetadata[]> {
  const { data, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export type AggregatedPreferences = {
  genreCounts: Record<string, number>;
  actorCounts: Record<string, number>;
  directorCounts: Record<string, number>;
  averageDuration: number;
};

export function aggregatePreferences(metadata: MovieMetadata[]): AggregatedPreferences {
  const genreCounts: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};
  const directorCounts: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const movie of metadata) {
    // Genres (comma-separated)
    if (movie.genre) {
      movie.genre.split(",").map(g => g.trim()).forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
    // Actors (comma-separated)
    if (movie.cast) {
      movie.cast.split(",").map(a => a.trim()).forEach(a => {
        actorCounts[a] = (actorCounts[a] || 0) + 1;
      });
    }
    // Directors (comma-separated)
    if (movie.director) {
      movie.director.split(",").map(d => d.trim()).forEach(d => {
        directorCounts[d] = (directorCounts[d] || 0) + 1;
      });
    }
    // Duration (e.g., "120 min")
    if (movie.duration) {
      const match = movie.duration.match(/(\d+)/);
      if (match) {
        totalDuration += parseInt(match[1], 10);
        durationCount += 1;
      }
    }
  }

  return {
    genreCounts,
    actorCounts,
    directorCounts,
    averageDuration: durationCount ? totalDuration / durationCount : 0,
  };
}

// Feature Engineering Types
export type FeatureVector = {
  genres: Record<string, number>;
  actors: Record<string, number>;
  directors: Record<string, number>;
  duration: number;
};

// Convert user preferences to feature vector
export function preferencesToFeatureVector(preferences: AggregatedPreferences): FeatureVector {
  return {
    genres: preferences.genreCounts,
    actors: preferences.actorCounts,
    directors: preferences.directorCounts,
    duration: preferences.averageDuration,
  };
}

// Convert movie metadata to feature vector
export function movieToFeatureVector(movie: MovieMetadata): FeatureVector {
  const genres: Record<string, number> = {};
  const actors: Record<string, number> = {};
  const directors: Record<string, number> = {};
  
  // Parse genres
  if (movie.genre && movie.genre !== 'N/A') {
    movie.genre.split(",").map(g => g.trim()).forEach(g => {
      if (g !== 'N/A') genres[g] = 1;
    });
  }
  
  // Parse actors
  if (movie.cast && movie.cast !== 'N/A') {
    movie.cast.split(",").map(a => a.trim()).forEach(a => {
      if (a !== 'N/A') actors[a] = 1;
    });
  }
  
  // Parse directors
  if (movie.director && movie.director !== 'N/A') {
    movie.director.split(",").map(d => d.trim()).forEach(d => {
      if (d !== 'N/A') directors[d] = 1;
    });
  }
  
  // Parse duration
  let duration = 0;
  if (movie.duration && movie.duration !== 'N/A') {
    const match = movie.duration.match(/(\d+)/);
    if (match) {
      duration = parseInt(match[1], 10);
    }
  }
  
  return { genres, actors, directors, duration };
}

// Calculate cosine similarity between two feature vectors
export function calculateSimilarity(userVector: FeatureVector, movieVector: FeatureVector): number {
  // Genre similarity (cosine similarity)
  const genreSimilarity = calculateCosineSimilarity(userVector.genres, movieVector.genres);
  
  // Actor similarity (cosine similarity)
  const actorSimilarity = calculateCosineSimilarity(userVector.actors, movieVector.actors);
  
  // Director similarity (cosine similarity)
  const directorSimilarity = calculateCosineSimilarity(userVector.directors, movieVector.directors);
  
  // Duration similarity (normalized difference)
  const durationSimilarity = calculateDurationSimilarity(userVector.duration, movieVector.duration);
  
  // Weighted combination (you can adjust these weights)
  const weights = { genre: 0.4, actor: 0.3, director: 0.2, duration: 0.1 };
  
  return (
    genreSimilarity * weights.genre +
    actorSimilarity * weights.actor +
    directorSimilarity * weights.director +
    durationSimilarity * weights.duration
  );
}

// Helper function to calculate cosine similarity between two vectors
function calculateCosineSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
  const allKeys = Array.from(new Set([...Object.keys(vec1), ...Object.keys(vec2)]));
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const key of allKeys) {
    const val1 = vec1[key] || 0;
    const val2 = vec2[key] || 0;
    
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Helper function to calculate duration similarity
function calculateDurationSimilarity(userDuration: number, movieDuration: number): number {
  if (userDuration === 0 || movieDuration === 0) return 0;
  
  const difference = Math.abs(userDuration - movieDuration);
  const maxDifference = Math.max(userDuration, movieDuration);
  
  // Convert to similarity (0 = very different, 1 = very similar)
  return Math.max(0, 1 - (difference / maxDifference));
}

// Generate recommendations based on user preferences
export async function generateRecommendations(
  userId: string, 
  preferences: AggregatedPreferences, 
  limit: number = 10
): Promise<Array<{ movie: MovieMetadata; similarity: number }>> {
  // Get all movies from the database (excluding user's own movies)
  const { data: allMovies, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .neq("user_id", userId);

  if (error || !allMovies) {
    throw new Error("Failed to fetch movies for recommendations");
  }

  // Convert user preferences to feature vector
  const userVector = preferencesToFeatureVector(preferences);
  
  // Calculate similarity for each movie
  const recommendations = allMovies
    .map(movie => {
      const movieVector = movieToFeatureVector(movie);
      const similarity = calculateSimilarity(userVector, movieVector);
      return { movie, similarity };
    })
    .filter(rec => rec.similarity > 0) // Only include movies with some similarity
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
    .slice(0, limit);

  return recommendations;
} 