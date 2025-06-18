const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://your-project.supabase.co'; // Replace with your actual URL
const supabaseKey = 'your-anon-key'; // Replace with your actual anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to read CSV file
function readCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index] ? values[index].trim() : '';
        });
        data.push(row);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

// Parse JSON arrays from TMDB data
function parseJSONArray(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

// Extract genres from TMDB genres JSON
function extractGenres(genresJson) {
  const genres = parseJSONArray(genresJson);
  return genres
    .map(g => g.name)
    .filter(name => name && name !== 'N/A')
    .join(', ');
}

// Extract cast from TMDB cast JSON
function extractCast(castJson) {
  const cast = parseJSONArray(castJson);
  return cast
    .slice(0, 10) // Limit to top 10 actors
    .map(c => c.name)
    .filter(name => name && name !== 'N/A')
    .join(', ');
}

// Extract director from TMDB crew JSON
function extractDirector(crewJson) {
  const crew = parseJSONArray(crewJson);
  const directors = crew
    .filter(c => c.job === 'Director')
    .map(c => c.name)
    .filter(name => name && name !== 'N/A');
  return directors.join(', ');
}

// Convert runtime to duration format
function formatDuration(runtime) {
  const minutes = parseInt(runtime, 10);
  if (isNaN(minutes) || minutes === 0) return 'N/A';
  return `${minutes} min`;
}

// Process TMDB movie data
function processTMDBMovie(movie) {
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
function processTMDBCredit(credit) {
  return {
    movie_id: credit.id?.toString() || '',
    cast: credit.cast || '[]',
    crew: credit.crew || '[]'
  };
}

// Combine movie and credit data
function combineMovieAndCredit(movie, credit) {
  return {
    title: movie.title,
    genre: movie.genres || 'N/A',
    cast: credit ? extractCast(credit.cast) : 'N/A',
    director: credit ? extractDirector(credit.crew) : 'N/A',
    duration: movie.runtime || 'N/A',
    poster_url: null // TMDB doesn't provide poster URLs in this dataset
  };
}

// Filter and clean movies
function filterValidMovies(movies) {
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
async function populateDatabaseWithTMDB(movies, credits, userId) {
  let successCount = 0;
  let errorCount = 0;

  // Create a map of credits by movie ID for quick lookup
  const creditsMap = new Map();
  credits.forEach(credit => {
    creditsMap.set(credit.movie_id, credit);
  });

  // Process movies in batches
  const BATCH_SIZE = 50;
  const validMovies = filterValidMovies(movies);

  console.log(`Processing ${validMovies.length} valid movies out of ${movies.length} total`);

  for (let i = 0; i < validMovies.length; i += BATCH_SIZE) {
    const batch = validMovies.slice(i, i + BATCH_SIZE);
    const batchData = [];

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

// Main function
async function main() {
  console.log('Starting TMDB database population...');
  
  // Read CSV files
  const moviesData = readCSVFile('tmdb_5000_movies.csv');
  const creditsData = readCSVFile('tmdb_5000_credits.csv');
  
  console.log(`Read ${moviesData.length} movies and ${creditsData.length} credits`);
  
  // Process the data
  const processedMovies = moviesData.map(processTMDBMovie);
  const processedCredits = creditsData.map(processTMDBCredit);
  
  // Use a default user ID for the system data
  const systemUserId = '00000000-0000-0000-0000-000000000000'; // System user ID
  
  // Populate database
  const result = await populateDatabaseWithTMDB(processedMovies, processedCredits, systemUserId);
  
  console.log('Database population completed!');
  console.log(`Successfully inserted: ${result.success} movies`);
  console.log(`Errors: ${result.errors} movies`);
}

// Run the script
main().catch(console.error); 