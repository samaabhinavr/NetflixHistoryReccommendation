const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Import the CSV parser functions
const {
  readCSVFile,
  parseJSONArray,
  extractGenres,
  extractCast,
  extractDirector,
  formatDuration,
  processTMDBMovie,
  processTMDBCredit,
  combineMovieAndCredit,
  filterValidMovies
} = require('./tmdb-csv-parser');

// Get Supabase credentials from environment variables (same as your app)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.log('Please make sure you have a .env.local file with:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
  console.log('🎬 Starting TMDB database population...');
  console.log(`🔗 Connecting to: ${supabaseUrl}\n`);
  
  // Read CSV files
  const moviesData = readCSVFile('tmdb_5000_movies.csv');
  const creditsData = readCSVFile('tmdb_5000_credits.csv');
  
  console.log(`📊 Read ${moviesData.length} movies and ${creditsData.length} credits`);
  
  // Process the data
  const processedMovies = moviesData.map(processTMDBMovie);
  const processedCredits = creditsData.map(processTMDBCredit);
  
  // Use a default user ID for the system data
  const systemUserId = '00000000-0000-0000-0000-000000000000'; // System user ID
  
  // Populate database
  const result = await populateDatabaseWithTMDB(processedMovies, processedCredits, systemUserId);
  
  console.log('\n🎉 Database population completed!');
  console.log(`✅ Successfully inserted: ${result.success} movies`);
  console.log(`❌ Errors: ${result.errors} movies`);
  
  if (result.errors > 0) {
    console.log('\n⚠️  Some movies failed to insert. Check the error messages above.');
  }
}

// Run the script
main().catch(console.error); 