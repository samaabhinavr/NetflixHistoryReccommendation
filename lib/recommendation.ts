import { supabase } from "@/lib/supabase";
import type { MovieMetadata } from "@/lib/supabase";

export async function fetchUserMetadata(userId: string): Promise<MovieMetadata[]> {
  console.log('fetchUserMetadata called for user:', userId);
  const { data, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error('Error fetching user metadata:', error);
    throw new Error(error.message);
  }
  
  console.log('Fetched metadata from database:', data?.length || 0, 'records');
  return data || [];
}

export type AggregatedPreferences = {
  genreCounts: Record<string, number>;
  actorCounts: Record<string, number>;
  directorCounts: Record<string, number>;
  averageDuration: number;
  totalMovies: number;
};

export function aggregatePreferences(metadata: MovieMetadata[]): AggregatedPreferences {
  const genreCounts: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};
  const directorCounts: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const movie of metadata) {
    // Genres (comma-separated)
    if (movie.genre && movie.genre !== 'N/A') {
      movie.genre.split(",").map(g => g.trim()).forEach(g => {
        if (g !== 'N/A') {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        }
      });
    }
    // Actors (comma-separated)
    if (movie.cast && movie.cast !== 'N/A') {
      movie.cast.split(",").map(a => a.trim()).forEach(a => {
        if (a !== 'N/A') {
          actorCounts[a] = (actorCounts[a] || 0) + 1;
        }
      });
    }
    // Directors (comma-separated)
    if (movie.director && movie.director !== 'N/A') {
      movie.director.split(",").map(d => d.trim()).forEach(d => {
        if (d !== 'N/A') {
          directorCounts[d] = (directorCounts[d] || 0) + 1;
        }
      });
    }
    // Duration (e.g., "120 min")
    if (movie.duration && movie.duration !== 'N/A') {
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
    totalMovies: metadata.length,
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
  // Normalize user preferences to give more weight to frequently watched items
  const normalizedGenres: Record<string, number> = {};
  const normalizedActors: Record<string, number> = {};
  const normalizedDirectors: Record<string, number> = {};
  
  // Normalize genres (give more weight to frequently watched genres)
  const totalGenreCount = Object.values(preferences.genreCounts).reduce((sum, count) => sum + count, 0);
  Object.entries(preferences.genreCounts).forEach(([genre, count]) => {
    normalizedGenres[genre] = count / totalGenreCount;
  });
  
  // Normalize actors (give more weight to frequently watched actors)
  const totalActorCount = Object.values(preferences.actorCounts).reduce((sum, count) => sum + count, 0);
  Object.entries(preferences.actorCounts).forEach(([actor, count]) => {
    normalizedActors[actor] = count / totalActorCount;
  });
  
  // Normalize directors (give more weight to frequently watched directors)
  const totalDirectorCount = Object.values(preferences.directorCounts).reduce((sum, count) => sum + count, 0);
  Object.entries(preferences.directorCounts).forEach(([director, count]) => {
    normalizedDirectors[director] = count / totalDirectorCount;
  });
  
  return {
    genres: normalizedGenres,
    actors: normalizedActors,
    directors: normalizedDirectors,
    duration: preferences.averageDuration,
  };
}

// Convert movie metadata to feature vector
export function movieToFeatureVector(movie: MovieMetadata): FeatureVector {
  const genres: Record<string, number> = {};
  const actors: Record<string, number> = {};
  const directors: Record<string, number> = {};
  
  // Parse genres with equal weight
  if (movie.genre && movie.genre !== 'N/A') {
    const genreList = movie.genre.split(",").map(g => g.trim()).filter(g => g !== 'N/A');
    const genreWeight = 1.0 / genreList.length; // Equal weight for each genre
    genreList.forEach(g => {
      genres[g] = genreWeight;
    });
  }
  
  // Parse actors with decreasing weight (first actors are more important)
  if (movie.cast && movie.cast !== 'N/A') {
    const actorList = movie.cast.split(",").map(a => a.trim()).filter(a => a !== 'N/A');
    actorList.forEach((actor, index) => {
      // Give higher weight to first few actors (main cast)
      const weight = index < 3 ? 1.0 - (index * 0.2) : 0.3;
      actors[actor] = weight;
    });
  }
  
  // Parse directors with equal weight
  if (movie.director && movie.director !== 'N/A') {
    const directorList = movie.director.split(",").map(d => d.trim()).filter(d => d !== 'N/A');
    const directorWeight = 1.0 / directorList.length; // Equal weight for each director
    directorList.forEach(d => {
      directors[d] = directorWeight;
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
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Genre similarity (weighted by user's genre preferences)
  const genreScore = calculateGenreSimilarity(userVector.genres, movieVector.genres);
  const genreWeight = 0.35;
  totalScore += genreScore * genreWeight;
  maxPossibleScore += genreWeight;
  
  // Actor similarity (weighted by user's actor preferences)
  const actorScore = calculateActorSimilarity(userVector.actors, movieVector.actors);
  const actorWeight = 0.35;
  totalScore += actorScore * actorWeight;
  maxPossibleScore += actorWeight;
  
  // Director similarity (weighted by user's director preferences)
  const directorScore = calculateDirectorSimilarity(userVector.directors, movieVector.directors);
  const directorWeight = 0.20;
  totalScore += directorScore * directorWeight;
  maxPossibleScore += directorWeight;
  
  // Duration similarity (bonus points for similar duration)
  const durationScore = calculateDurationSimilarity(userVector.duration, movieVector.duration);
  const durationWeight = 0.10;
  totalScore += durationScore * durationWeight;
  maxPossibleScore += durationWeight;
  
  // Normalize to 0-1 range
  return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
}

// Enhanced genre similarity calculation
function calculateGenreSimilarity(userGenres: Record<string, number>, movieGenres: Record<string, number>): number {
  if (Object.keys(userGenres).length === 0 || Object.keys(movieGenres).length === 0) {
    return 0;
  }
  
  const userGenreKeys = Object.keys(userGenres);
  const movieGenreKeys = Object.keys(movieGenres);
  
  // Find matching genres
  const matchingGenres = userGenreKeys.filter(genre => movieGenreKeys.includes(genre));
  
  if (matchingGenres.length === 0) {
    return 0;
  }
  
  // Calculate weighted score based on user's genre preferences
  let totalUserWeight = 0;
  let matchingWeight = 0;
  
  userGenreKeys.forEach(genre => {
    const weight = userGenres[genre];
    totalUserWeight += weight;
    if (matchingGenres.includes(genre)) {
      matchingWeight += weight;
    }
  });
  
  // Bonus for having multiple matching genres
  const genreOverlapBonus = Math.min(matchingGenres.length / Math.max(userGenreKeys.length, movieGenreKeys.length), 0.3);
  
  return (matchingWeight / totalUserWeight) + genreOverlapBonus;
}

// Enhanced actor similarity calculation
function calculateActorSimilarity(userActors: Record<string, number>, movieActors: Record<string, number>): number {
  if (Object.keys(userActors).length === 0 || Object.keys(movieActors).length === 0) {
    return 0;
  }
  
  const userActorKeys = Object.keys(userActors);
  const movieActorKeys = Object.keys(movieActors);
  
  // Find matching actors
  const matchingActors = userActorKeys.filter(actor => movieActorKeys.includes(actor));
  
  if (matchingActors.length === 0) {
    return 0;
  }
  
  // Calculate weighted score based on user's actor preferences
  let totalUserWeight = 0;
  let matchingWeight = 0;
  
  userActorKeys.forEach(actor => {
    const weight = userActors[actor];
    totalUserWeight += weight;
    if (matchingActors.includes(actor)) {
      matchingWeight += weight;
    }
  });
  
  // Bonus for having multiple matching actors (especially top actors)
  const topActorBonus = matchingActors.length >= 2 ? 0.2 : 0;
  const actorOverlapBonus = Math.min(matchingActors.length / Math.max(userActorKeys.length, movieActorKeys.length), 0.2);
  
  return (matchingWeight / totalUserWeight) + topActorBonus + actorOverlapBonus;
}

// Enhanced director similarity calculation
function calculateDirectorSimilarity(userDirectors: Record<string, number>, movieDirectors: Record<string, number>): number {
  if (Object.keys(userDirectors).length === 0 || Object.keys(movieDirectors).length === 0) {
    return 0;
  }
  
  const userDirectorKeys = Object.keys(userDirectors);
  const movieDirectorKeys = Object.keys(movieDirectors);
  
  // Find matching directors
  const matchingDirectors = userDirectorKeys.filter(director => movieDirectorKeys.includes(director));
  
  if (matchingDirectors.length === 0) {
    return 0;
  }
  
  // Director matches are very valuable - give high scores
  let totalUserWeight = 0;
  let matchingWeight = 0;
  
  userDirectorKeys.forEach(director => {
    const weight = userDirectors[director];
    totalUserWeight += weight;
    if (matchingDirectors.includes(director)) {
      matchingWeight += weight;
    }
  });
  
  // High bonus for director matches
  const directorMatchBonus = 0.3;
  
  return (matchingWeight / totalUserWeight) + directorMatchBonus;
}

// Helper function to calculate cosine similarity between two vectors (kept for reference)
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

// Enhanced duration similarity calculation
function calculateDurationSimilarity(userDuration: number, movieDuration: number): number {
  if (userDuration === 0 || movieDuration === 0) return 0;
  
  const difference = Math.abs(userDuration - movieDuration);
  
  // More forgiving duration matching
  if (difference <= 15) return 1.0; // Very similar
  if (difference <= 30) return 0.8; // Similar
  if (difference <= 45) return 0.6; // Somewhat similar
  if (difference <= 60) return 0.4; // Moderately different
  if (difference <= 90) return 0.2; // Different
  return 0.0; // Very different
}

// Get popular movies as fallback recommendations
async function getPopularMovies(limit: number = 10): Promise<MovieMetadata[]> {
  // For now, we'll get a random selection of movies with good metadata
  // In a real system, you might use ratings, popularity scores, etc.
  const { data, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .neq("cast", "N/A")
    .neq("director", "N/A")
    .neq("genre", "N/A")
    .limit(limit * 2); // Get more to allow for random selection

  if (error || !data) {
    throw new Error("Failed to fetch popular movies");
  }

  // Shuffle and return the requested number
  return data.sort(() => Math.random() - 0.5).slice(0, limit);
}

// Get genre-based recommendations
async function getGenreBasedRecommendations(
  topGenres: string[], 
  limit: number = 10
): Promise<MovieMetadata[]> {
  if (topGenres.length === 0) return [];

  const { data, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .or(topGenres.map(genre => `genre.ilike.%${genre}%`).join(","))
    .neq("cast", "N/A")
    .limit(limit * 2);

  if (error || !data) {
    throw new Error("Failed to fetch genre-based recommendations");
  }

  return data.sort(() => Math.random() - 0.5).slice(0, limit);
}

// Add diversity to recommendations by ensuring different genres
function addDiversityToRecommendations(
  recommendations: Array<{ movie: MovieMetadata; similarity: number }>,
  targetCount: number = 10
): Array<{ movie: MovieMetadata; similarity: number }> {
  if (recommendations.length <= targetCount) return recommendations;

  const diverseRecommendations: Array<{ movie: MovieMetadata; similarity: number }> = [];
  const usedGenres = new Set<string>();
  const usedDirectors = new Set<string>();

  // First, add the top recommendation
  if (recommendations.length > 0) {
    diverseRecommendations.push(recommendations[0]);
    if (recommendations[0].movie.genre) {
      recommendations[0].movie.genre.split(",").forEach(g => usedGenres.add(g.trim()));
    }
    if (recommendations[0].movie.director) {
      recommendations[0].movie.director.split(",").forEach(d => usedDirectors.add(d.trim()));
    }
  }

  // Then add diverse recommendations
  for (let i = 1; i < recommendations.length && diverseRecommendations.length < targetCount; i++) {
    const rec = recommendations[i];
    const movieGenres = rec.movie.genre ? rec.movie.genre.split(",").map(g => g.trim()) : [];
    const movieDirectors = rec.movie.director ? rec.movie.director.split(",").map(d => d.trim()) : [];

    // Check if this movie adds diversity
    const hasNewGenre = movieGenres.some(g => !usedGenres.has(g));
    const hasNewDirector = movieDirectors.some(d => !usedDirectors.has(d));

    if (hasNewGenre || hasNewDirector || diverseRecommendations.length < targetCount / 2) {
      diverseRecommendations.push(rec);
      movieGenres.forEach(g => usedGenres.add(g));
      movieDirectors.forEach(d => usedDirectors.add(d));
    }
  }

  return diverseRecommendations;
}

// Generate recommendations based on user preferences
export async function generateRecommendations(
  userId: string, 
  preferences: AggregatedPreferences, 
  limit: number = 10
): Promise<Array<{ movie: MovieMetadata; similarity: number; reason: string }>> {
  // Get user's viewing history to exclude from recommendations
  const { data: userMovies, error: userError } = await supabase
    .from("movie_metadata")
    .select("title")
    .eq("user_id", userId);

  if (userError) {
    throw new Error("Failed to fetch user's viewing history");
  }

  // Create a set of titles the user has already watched (case-insensitive)
  const userWatchedTitles = new Set(
    (userMovies || []).map(movie => movie.title.toLowerCase().trim())
  );

  // Get all movies from the database (excluding user's own movies)
  const { data: allMovies, error } = await supabase
    .from("movie_metadata")
    .select("*")
    .neq("user_id", userId);

  if (error || !allMovies) {
    console.error("Failed to fetch movies for recommendations:", error);
    throw new Error("Failed to fetch movies for recommendations");
  }

  console.log(`Found ${allMovies.length} movies in database for recommendations`);

  // Filter out movies the user has already watched
  const unwatchedMovies = allMovies.filter(movie => 
    !userWatchedTitles.has(movie.title.toLowerCase().trim())
  );

  console.log(`Found ${unwatchedMovies.length} unwatched movies for recommendations`);

  // If user has very few movies, use fallback strategies
  if (preferences.totalMovies < 3) {
    const popularMovies = await getPopularMovies(limit);
    // Filter out movies the user has already watched
    const unwatchedPopularMovies = popularMovies.filter(movie => 
      !userWatchedTitles.has(movie.title.toLowerCase().trim())
    );
    return unwatchedPopularMovies.map(movie => ({
      movie,
      similarity: 0.5, // Default similarity for popular movies
      reason: "Popular movies for new users"
    }));
  }

  // Convert user preferences to feature vector
  const userVector = preferencesToFeatureVector(preferences);
  
  // Calculate similarity for each unwatched movie
  const recommendations = unwatchedMovies
    .map(movie => {
      const movieVector = movieToFeatureVector(movie);
      const similarity = calculateSimilarity(userVector, movieVector);
      return { movie, similarity };
    })
    .filter(rec => rec.similarity > 0.05) // Lower threshold to show more recommendations
    .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

  console.log(`Generated ${recommendations.length} recommendations with similarity > 0.05`);

  // If we don't have enough recommendations, add genre-based ones
  if (recommendations.length < limit) {
    const topGenres = Object.entries(preferences.genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const genreRecommendations = await getGenreBasedRecommendations(topGenres, limit - recommendations.length);
    
    // Filter out movies the user has already watched
    const unwatchedGenreRecommendations = genreRecommendations.filter(movie => 
      !userWatchedTitles.has(movie.title.toLowerCase().trim())
    );

    unwatchedGenreRecommendations.forEach(movie => {
      if (!recommendations.find(r => r.movie.id === movie.id)) {
        recommendations.push({
          movie,
          similarity: 0.3, // Lower similarity for genre-based recommendations
        });
      }
    });
  }

  // Add diversity and limit results
  const diverseRecommendations = addDiversityToRecommendations(recommendations, limit);

  console.log(`Final diverse recommendations: ${diverseRecommendations.length}`);

  // Add reasoning for each recommendation
  return diverseRecommendations.map(rec => {
    const reasons = [];
    
    // Check genre overlap
    if (rec.movie.genre && preferences.genreCounts) {
      const movieGenres = rec.movie.genre.split(",").map(g => g.trim());
      const matchingGenres = movieGenres.filter(g => preferences.genreCounts[g]);
      if (matchingGenres.length > 0) {
        reasons.push(`Similar genres: ${matchingGenres.join(", ")}`);
      }
    }

    // Check actor overlap
    if (rec.movie.cast && preferences.actorCounts) {
      const movieActors = rec.movie.cast.split(",").map(a => a.trim());
      const matchingActors = movieActors.filter(a => preferences.actorCounts[a]);
      if (matchingActors.length > 0) {
        reasons.push(`Featuring: ${matchingActors.join(", ")}`);
      }
    }

    // Check director overlap
    if (rec.movie.director && preferences.directorCounts) {
      const movieDirectors = rec.movie.director.split(",").map(d => d.trim());
      const matchingDirectors = movieDirectors.filter(d => preferences.directorCounts[d]);
      if (matchingDirectors.length > 0) {
        reasons.push(`Directed by: ${matchingDirectors.join(", ")}`);
      }
    }

    // Check duration similarity
    if (preferences.averageDuration > 0 && rec.movie.duration) {
      const match = rec.movie.duration.match(/(\d+)/);
      if (match) {
        const movieDuration = parseInt(match[1], 10);
        const durationDiff = Math.abs(preferences.averageDuration - movieDuration);
        if (durationDiff < 30) {
          reasons.push("Similar duration to your preferences");
        }
      }
    }

    return {
      ...rec,
      reason: reasons.length > 0 ? reasons.join(" • ") : "Based on your viewing patterns"
    };
  });
} 