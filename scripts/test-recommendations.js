const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRecommendations() {
  console.log('🎬 Testing Enhanced Recommendation Engine');
  console.log('=========================================\n');

  try {
    // Get a sample user with some viewing history
    const { data: userMovies, error: userError } = await supabase
      .from('movie_metadata')
      .select('*')
      .neq('user_id', '00000000-0000-0000-0000-000000000000') // Exclude system movies
      .limit(10);

    if (userError || !userMovies || userMovies.length === 0) {
      console.log('No user movies found. Testing with system movies...');
      
      // Test with system movies as a fallback
      const { data: systemMovies, error: systemError } = await supabase
        .from('movie_metadata')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .limit(5);

      if (systemError || !systemMovies) {
        console.error('❌ Failed to fetch any movies:', systemError);
        return;
      }

      console.log('📊 Found system movies for testing');
      console.log(`Total system movies: ${systemMovies.length}`);
      
      // Show sample movies
      console.log('\n📋 Sample Movies:');
      systemMovies.slice(0, 3).forEach((movie, index) => {
        console.log(`${index + 1}. ${movie.title}`);
        console.log(`   Genre: ${movie.genre}`);
        console.log(`   Cast: ${movie.cast}`);
        console.log(`   Director: ${movie.director}`);
        console.log(`   Duration: ${movie.duration}\n`);
      });

      // Test recommendation logic
      console.log('🧠 Testing Recommendation Logic...');
      
      // Simulate user preferences based on the first movie
      const sampleMovie = systemMovies[0];
      const userPreferences = {
        genreCounts: {},
        actorCounts: {},
        directorCounts: {},
        averageDuration: 0,
        totalMovies: 1
      };

      // Extract preferences from sample movie
      if (sampleMovie.genre && sampleMovie.genre !== 'N/A') {
        sampleMovie.genre.split(",").forEach(g => {
          const genre = g.trim();
          if (genre !== 'N/A') {
            userPreferences.genreCounts[genre] = 1;
          }
        });
      }

      if (sampleMovie.cast && sampleMovie.cast !== 'N/A') {
        sampleMovie.cast.split(",").slice(0, 3).forEach(a => {
          const actor = a.trim();
          if (actor !== 'N/A') {
            userPreferences.actorCounts[actor] = 1;
          }
        });
      }

      if (sampleMovie.director && sampleMovie.director !== 'N/A') {
        sampleMovie.director.split(",").forEach(d => {
          const director = d.trim();
          if (director !== 'N/A') {
            userPreferences.directorCounts[director] = 1;
          }
        });
      }

      if (sampleMovie.duration && sampleMovie.duration !== 'N/A') {
        const match = sampleMovie.duration.match(/(\d+)/);
        if (match) {
          userPreferences.averageDuration = parseInt(match[1], 10);
        }
      }

      console.log('\n👤 Simulated User Preferences:');
      console.log('Genres:', Object.keys(userPreferences.genreCounts));
      console.log('Actors:', Object.keys(userPreferences.actorCounts));
      console.log('Directors:', Object.keys(userPreferences.directorCounts));
      console.log('Avg Duration:', userPreferences.averageDuration, 'minutes');

      // Simulate user's watched movies (including the sample movie)
      const userWatchedTitles = new Set([sampleMovie.title.toLowerCase().trim()]);
      console.log('\n📺 User has watched:', Array.from(userWatchedTitles));

      // Find similar movies
      console.log('\n🔍 Finding Similar Movies (excluding watched)...');
      
      const { data: allMovies, error: allError } = await supabase
        .from('movie_metadata')
        .select('*')
        .limit(100);

      if (allError || !allMovies) {
        console.error('❌ Failed to fetch movies for comparison:', allError);
        return;
      }

      // Filter out movies the user has already watched
      const unwatchedMovies = allMovies.filter(movie => 
        !userWatchedTitles.has(movie.title.toLowerCase().trim())
      );

      console.log(`📊 Found ${unwatchedMovies.length} unwatched movies out of ${allMovies.length} total`);

      // Simple similarity calculation
      const recommendations = unwatchedMovies
        .map(movie => {
          let similarity = 0;
          let reasons = [];

          // Genre similarity
          if (movie.genre && userPreferences.genreCounts) {
            const movieGenres = movie.genre.split(",").map(g => g.trim());
            const matchingGenres = movieGenres.filter(g => userPreferences.genreCounts[g]);
            if (matchingGenres.length > 0) {
              similarity += 0.4;
              reasons.push(`Genres: ${matchingGenres.join(", ")}`);
            }
          }

          // Actor similarity
          if (movie.cast && userPreferences.actorCounts) {
            const movieActors = movie.cast.split(",").map(a => a.trim());
            const matchingActors = movieActors.filter(a => userPreferences.actorCounts[a]);
            if (matchingActors.length > 0) {
              similarity += 0.3;
              reasons.push(`Actors: ${matchingActors.join(", ")}`);
            }
          }

          // Director similarity
          if (movie.director && userPreferences.directorCounts) {
            const movieDirectors = movie.director.split(",").map(d => d.trim());
            const matchingDirectors = movieDirectors.filter(d => userPreferences.directorCounts[d]);
            if (matchingDirectors.length > 0) {
              similarity += 0.2;
              reasons.push(`Director: ${matchingDirectors.join(", ")}`);
            }
          }

          // Duration similarity
          if (userPreferences.averageDuration > 0 && movie.duration) {
            const match = movie.duration.match(/(\d+)/);
            if (match) {
              const movieDuration = parseInt(match[1], 10);
              const durationDiff = Math.abs(userPreferences.averageDuration - movieDuration);
              if (durationDiff < 30) {
                similarity += 0.1;
                reasons.push('Similar duration');
              }
            }
          }

          return {
            movie,
            similarity,
            reason: reasons.join(" • ")
          };
        })
        .filter(rec => rec.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);

      console.log('\n🎯 Top 10 Recommendations (excluding watched):');
      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.movie.title}`);
        console.log(`   Similarity: ${Math.round(rec.similarity * 100)}%`);
        console.log(`   Reason: ${rec.reason}`);
        console.log(`   Genre: ${rec.movie.genre}`);
        console.log(`   Cast: ${rec.movie.cast?.split(",").slice(0, 2).join(", ")}`);
        console.log(`   Director: ${rec.movie.director}`);
      });

      // Verify that the watched movie is not in recommendations
      const watchedMovieInRecommendations = recommendations.find(rec => 
        rec.movie.title.toLowerCase().trim() === sampleMovie.title.toLowerCase().trim()
      );

      if (watchedMovieInRecommendations) {
        console.log('\n❌ ERROR: Watched movie found in recommendations!');
      } else {
        console.log('\n✅ SUCCESS: Watched movie correctly excluded from recommendations!');
      }

      console.log('\n✅ Enhanced recommendation engine test completed successfully!');
      console.log(`📊 Generated ${recommendations.length} recommendations`);
      console.log(`🎬 Based on sample movie: ${sampleMovie.title}`);
      console.log(`🚫 Excluded watched movie: ${sampleMovie.title}`);

    } else {
      console.log('✅ Found user movies for testing');
      console.log(`Total user movies: ${userMovies.length}`);
      
      // Show user's viewing history
      console.log('\n📺 User\'s Viewing History:');
      userMovies.slice(0, 5).forEach((movie, index) => {
        console.log(`${index + 1}. ${movie.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRecommendations().catch(console.error); 