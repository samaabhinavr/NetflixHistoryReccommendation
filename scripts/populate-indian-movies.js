const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Data cleaning and validation functions
function cleanTitle(title) {
  if (!title) return 'Unknown';
  return title.trim()
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function cleanYear(year) {
  if (!year) return null;
  const yearNum = parseInt(year, 10);
  return (yearNum >= 1900 && yearNum <= new Date().getFullYear()) ? yearNum : null;
}

function cleanDuration(duration) {
  if (!duration) return null;
  const durationNum = parseInt(duration, 10);
  return (durationNum > 0 && durationNum < 1000) ? `${durationNum} min` : null;
}

function cleanGenre(genre) {
  if (!genre) return 'N/A';
  return genre.trim()
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/\s*,\s*/g, ', ') // Normalize comma spacing
    .trim();
}

function cleanRating(rating) {
  if (!rating) return null;
  const ratingNum = parseFloat(rating);
  return (ratingNum >= 0 && ratingNum <= 10) ? ratingNum : null;
}

function cleanVotes(votes) {
  if (!votes) return 0;
  const votesNum = parseInt(votes, 10);
  return (votesNum >= 0) ? votesNum : 0;
}

function cleanDirector(director) {
  if (!director) return 'N/A';
  return director.trim()
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function cleanCast(actor1, actor2, actor3) {
  const actors = [actor1, actor2, actor3]
    .filter(actor => actor && actor.trim() !== '')
    .map(actor => actor.trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
    );
  
  return actors.length > 0 ? actors.join(', ') : 'N/A';
}

function validateMovie(movie) {
  // Must have at least a title
  if (!movie.title || movie.title === 'Unknown') {
    return false;
  }
  
  // Must have at least one of: director, cast, genre
  if (movie.director === 'N/A' && movie.cast === 'N/A' && movie.genre === 'N/A') {
    return false;
  }
  
  return true;
}

async function populateIndianMovies() {
  console.log('🎬 Starting Indian Movies Database Population');
  console.log('=============================================\n');

  const movies = [];
  let processedCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  try {
    // Read and parse the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream('movies_data.csv')
        .pipe(csv())
        .on('data', (row) => {
          processedCount++;
          
          // Clean and validate the data
          const movie = {
            title: cleanTitle(row.Name),
            genre: cleanGenre(row.Genre),
            director: cleanDirector(row.Director),
            cast: cleanCast(row['Actor 1'], row['Actor 2'], row['Actor 3']),
            duration: cleanDuration(row.Duration),
            user_id: '00000000-0000-0000-0000-000000000000', // System movies
            created_at: new Date().toISOString()
          };

          if (validateMovie(movie)) {
            movies.push(movie);
            validCount++;
          } else {
            invalidCount++;
          }

          // Progress indicator
          if (processedCount % 500 === 0) {
            console.log(`📊 Processed ${processedCount} movies...`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`\n✅ CSV Processing Complete:`);
    console.log(`   Total processed: ${processedCount}`);
    console.log(`   Valid movies: ${validCount}`);
    console.log(`   Invalid movies: ${invalidCount}`);
    console.log(`   Success rate: ${((validCount / processedCount) * 100).toFixed(1)}%`);

    if (validCount === 0) {
      console.log('❌ No valid movies found. Exiting.');
      return;
    }

    // Check for existing movies to avoid duplicates
    console.log('\n🔍 Checking for existing movies...');
    const { data: existingMovies, error: existingError } = await supabase
      .from('movie_metadata')
      .select('title')
      .eq('user_id', '00000000-0000-0000-0000-000000000000');

    if (existingError) {
      console.error('❌ Error checking existing movies:', existingError);
      return;
    }

    const existingTitles = new Set(
      existingMovies.map(m => m.title.toLowerCase())
    );

    // Filter out duplicates
    const newMovies = movies.filter(movie => {
      return !existingTitles.has(movie.title.toLowerCase());
    });

    console.log(`📊 Duplicate check complete:`);
    console.log(`   New movies to add: ${newMovies.length}`);
    console.log(`   Duplicates found: ${movies.length - newMovies.length}`);

    if (newMovies.length === 0) {
      console.log('✅ All movies already exist in database.');
      return;
    }

    // Insert movies in batches
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    console.log(`\n🚀 Inserting ${newMovies.length} movies in batches of ${batchSize}...`);

    for (let i = 0; i < newMovies.length; i += batchSize) {
      const batch = newMovies.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('movie_metadata')
          .insert(batch);

        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Inserted ${batch.length} movies`);
        }
      } catch (err) {
        console.error(`❌ Exception in batch ${Math.floor(i / batchSize) + 1}:`, err);
        errorCount += batch.length;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Database Population Complete!`);
    console.log(`   Successfully inserted: ${insertedCount} movies`);
    console.log(`   Errors: ${errorCount} movies`);
    console.log(`   Total movies in database: ${insertedCount + (existingMovies?.length || 0)}`);

    // Show some sample movies
    console.log(`\n📋 Sample of added movies:`);
    newMovies.slice(0, 5).forEach((movie, index) => {
      console.log(`   ${index + 1}. ${movie.title} - ${movie.genre}`);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the population script
populateIndianMovies().catch(console.error); 