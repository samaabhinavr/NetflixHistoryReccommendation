import { supabase } from './supabase';
import type { MovieMetadata } from './supabase';

export interface TMDBMovie {
  id: string;
  title: string;
  genres: string;
  runtime: string;
  release_date: string;
  overview: string;
  vote_average: string;
  vote_count: string;
}

export interface TMDBCredit {
  movie_id: string;
  cast: string;
  crew: string;
}

// Parse JSON arrays from TMDB data
function parseJSONArray(jsonString: string): any[] {
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

// Extract genres from TMDB genres JSON
function extractGenres(genresJson: string): string {
  const genres = parseJSONArray(genresJson);
  return genres
    .map((g: any) => g.name)
    .filter((name: string) => name && name !== 'N/A')
    .join(', ');
}

// Extract cast from TMDB cast JSON
function extractCast(castJson: string): string {
  const cast = parseJSONArray(castJson);
  return cast
    .slice(0, 10) // Limit to top 10 actors
    .map((c: any) => c.name)
    .filter((name: string) => name && name !== 'N/A')
    .join(', ');
}

// Extract director from TMDB crew JSON
function extractDirector(crewJson: string): string {
  const crew = parseJSONArray(crewJson);
  const directors = crew
    .filter((c: any) => c.job === 'Director')
    .map((c: any) => c.name)
    .filter((name: string) => name && name !== 'N/A');
  return directors.join(', ');
}

// Convert runtime to duration format
function formatDuration(runtime: string): string {
  const minutes = parseInt(runtime, 10);
  if (isNaN(minutes) || minutes === 0) return 'N/A';
  return `${minutes} min`;
}

// Process TMDB movie data
export function processTMDBMovie(movie: any): TMDBMovie {
  return {
    id: movie.id?.toString() || '',
    title: movie.title || movie.original_title || 'Unknown',
    genres: extractGenres(movie.genres || '[]'),
    runtime: formatDuration(movie.runtime || '0'),
    release_date: movie.release_date || '',
    overview: movie.overview || '',
    vote_average: movie.vote_average?.toString() || '0',
    vote_count: movie.vote_count?.toString() || '0'
  };
}

// Process TMDB credit data
export function processTMDBCredit(credit: any): TMDBCredit {
  return {
    movie_id: credit.id?.toString() || '',
    cast: credit.cast || '[]',
    crew: credit.crew || '[]'
  };
}

// Combine movie and credit data
export function combineMovieAndCredit(
  movie: TMDBMovie, 
  credit: TMDBCredit | null
): MovieMetadata {
  return {
    title: movie.title,
    genre: movie.genres || 'N/A',
    cast: credit ? extractCast(credit.cast) : 'N/A',
    director: credit ? extractDirector(credit.crew) : 'N/A',
    duration: movie.runtime || 'N/A',
    poster_url: undefined // TMDB doesn't provide poster URLs in this dataset
  };
}

// Filter and clean movies
export function filterValidMovies(movies: TMDBMovie[]): TMDBMovie[] {
  return movies.filter(movie => 
    movie.title && 
    movie.title !== 'Unknown' && 
    movie.title !== 'N/A' &&
    movie.genres && 
    movie.genres.length > 0 &&
    movie.runtime !== 'N/A'
  );
}

// Populate database with TMDB data
export async function populateDatabaseWithTMDB(
  movies: TMDBMovie[], 
  credits: TMDBCredit[], 
  userId: string
): Promise<{ success: number; errors: number }> {
  let successCount = 0;
  let errorCount = 0;

  // Create a map of credits by movie ID for quick lookup
  const creditsMap = new Map<string, TMDBCredit>();
  credits.forEach(credit => {
    creditsMap.set(credit.movie_id, credit);
  });

  // Process movies in batches
  const BATCH_SIZE = 50;
  const validMovies = filterValidMovies(movies);

  console.log(`Processing ${validMovies.length} valid movies out of ${movies.length} total`);

  for (let i = 0; i < validMovies.length; i += BATCH_SIZE) {
    const batch = validMovies.slice(i, i + BATCH_SIZE);
    const batchData: MovieMetadata[] = [];

    for (const movie of batch) {
      const credit = creditsMap.get(movie.id) || null;
      const movieMetadata = combineMovieAndCredit(movie, credit);
      
      // Add user_id for database insertion
      const dataToInsert = {
        ...movieMetadata,
        user_id: userId
      };

      batchData.push(dataToInsert);
    }

    // Insert batch into database
    const { error } = await supabase
      .from('movie_metadata')
      .insert(batchData);

    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`Successfully inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} movies)`);
    }

    // Add a small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { success: successCount, errors: errorCount };
} 