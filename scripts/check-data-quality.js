const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataQuality() {
  console.log('🔍 Checking Data Quality');
  console.log('========================\n');

  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('movie_metadata')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      return;
    }

    console.log(`📊 Total movies in database: ${count}`);

    // Get sample data with different characteristics
    const { data: samples, error: sampleError } = await supabase
      .from('movie_metadata')
      .select('*')
      .limit(10);

    if (sampleError) {
      console.error('Error getting samples:', sampleError);
      return;
    }

    console.log('\n📋 Sample Data Analysis:');
    console.log('========================');

    let hasCast = 0;
    let hasDirector = 0;
    let hasGenres = 0;
    let hasDuration = 0;

    samples.forEach((movie, index) => {
      console.log(`\n${index + 1}. ${movie.title}`);
      console.log(`   Genre: ${movie.genre || 'N/A'}`);
      console.log(`   Cast: ${movie.cast || 'N/A'}`);
      console.log(`   Director: ${movie.director || 'N/A'}`);
      console.log(`   Duration: ${movie.duration || 'N/A'}`);

      if (movie.cast && movie.cast !== 'N/A') hasCast++;
      if (movie.director && movie.director !== 'N/A') hasDirector++;
      if (movie.genre && movie.genre !== 'N/A') hasGenres++;
      if (movie.duration && movie.duration !== 'N/A') hasDuration++;
    });

    console.log('\n📈 Data Quality Summary:');
    console.log(`   Movies with cast info: ${hasCast}/10`);
    console.log(`   Movies with director info: ${hasDirector}/10`);
    console.log(`   Movies with genres: ${hasGenres}/10`);
    console.log(`   Movies with duration: ${hasDuration}/10`);

    // Check for movies with good data
    const { data: goodData, error: goodError } = await supabase
      .from('movie_metadata')
      .select('*')
      .neq('cast', 'N/A')
      .neq('director', 'N/A')
      .limit(5);

    if (!goodError && goodData.length > 0) {
      console.log('\n🎯 Movies with Complete Data:');
      goodData.forEach((movie, index) => {
        console.log(`\n${index + 1}. ${movie.title}`);
        console.log(`   Genre: ${movie.genre}`);
        console.log(`   Cast: ${movie.cast}`);
        console.log(`   Director: ${movie.director}`);
        console.log(`   Duration: ${movie.duration}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDataQuality().catch(console.error); 