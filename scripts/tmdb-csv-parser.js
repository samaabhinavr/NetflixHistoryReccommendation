const fs = require('fs');

// Function to read CSV file with proper handling of quoted fields containing commas
function readCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length === 0) {
      console.log('Empty file');
      return [];
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    console.log('Headers:', headers);
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
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

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

// Parse JSON arrays from TMDB data
function parseJSONArray(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString.substring(0, 100) + '...');
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
    movie_id: credit.movie_id?.toString() || '',
    cast: extractCast(credit.cast || '[]'),
    crew: extractDirector(credit.crew || '[]')
  };
}

// Combine movie and credit data
function combineMovieAndCredit(movie, credit) {
  return {
    title: movie.title,
    genre: movie.genres || 'N/A',
    cast: credit ? credit.cast : 'N/A',
    director: credit ? credit.crew : 'N/A',
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

// Test the parser
function testParser() {
  console.log('Testing CSV parser...');
  
  // Test with a small sample
  const moviesData = readCSVFile('tmdb_5000_movies.csv');
  const creditsData = readCSVFile('tmdb_5000_credits.csv');
  
  console.log(`Read ${moviesData.length} movies and ${creditsData.length} credits`);
  
  if (moviesData.length > 0) {
    console.log('Sample movie data:');
    console.log(JSON.stringify(moviesData[0], null, 2));
  }
  
  if (creditsData.length > 0) {
    console.log('Sample credit data:');
    console.log(JSON.stringify(creditsData[0], null, 2));
  }
  
  // Process a few samples
  const processedMovies = moviesData.slice(0, 3).map(processTMDBMovie);
  const processedCredits = creditsData.slice(0, 3).map(processTMDBCredit);
  
  console.log('Sample processed movie:');
  console.log(JSON.stringify(processedMovies[0], null, 2));
  
  console.log('Sample processed credit:');
  console.log(JSON.stringify(processedCredits[0], null, 2));
  
  // Test combining
  if (processedMovies.length > 0 && processedCredits.length > 0) {
    const combined = combineMovieAndCredit(processedMovies[0], processedCredits[0]);
    console.log('Sample combined data:');
    console.log(JSON.stringify(combined, null, 2));
  }
}

// Export functions for use in other scripts
module.exports = {
  readCSVFile,
  parseCSVLine,
  parseJSONArray,
  extractGenres,
  extractCast,
  extractDirector,
  formatDuration,
  processTMDBMovie,
  processTMDBCredit,
  combineMovieAndCredit,
  filterValidMovies
};

// Run test if this file is executed directly
if (require.main === module) {
  testParser();
} 