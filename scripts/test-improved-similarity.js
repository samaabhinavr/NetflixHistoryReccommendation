const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simplified similarity calculation for testing
function calculateImprovedSimilarity(userPrefs, movie) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Genre similarity
  if (userPrefs.genres && movie.genre && movie.genre !== 'N/A') {
    const userGenres = Object.keys(userPrefs.genres);
    const movieGenres = movie.genre.split(",").map(g => g.trim());
    const matchingGenres = userGenres.filter(g => movieGenres.includes(g));
    
    if (matchingGenres.length > 0) {
      const genreScore = (matchingGenres.length / userGenres.length) + 
                        Math.min(matchingGenres.length / Math.max(userGenres.length, movieGenres.length), 0.3);
      totalScore += genreScore * 0.35;
      maxPossibleScore += 0.35;
    }
  }
  
  // Actor similarity
  if (userPrefs.actors && movie.cast && movie.cast !== 'N/A') {
    const userActors = Object.keys(userPrefs.actors);
    const movieActors = movie.cast.split(",").map(a => a.trim());
    const matchingActors = userActors.filter(a => movieActors.includes(a));
    
    if (matchingActors.length > 0) {
      const actorScore = (matchingActors.length / userActors.length) + 
                        (matchingActors.length >= 2 ? 0.2 : 0) +
                        Math.min(matchingActors.length / Math.max(userActors.length, movieActors.length), 0.2);
      totalScore += actorScore * 0.35;
      maxPossibleScore += 0.35;
    }
  }
  
  // Director similarity
  if (userPrefs.directors && movie.director && movie.director !== 'N/A') {
    const userDirectors = Object.keys(userPrefs.directors);
    const movieDirectors = movie.director.split(",").map(d => d.trim());
    const matchingDirectors = userDirectors.filter(d => movieDirectors.includes(d));
    
    if (matchingDirectors.length > 0) {
      const directorScore = (matchingDirectors.length / userDirectors.length) + 0.3;
      totalScore += directorScore * 0.20;
      maxPossibleScore += 0.20;
    }
  }
  
  // Duration similarity
  if (userPrefs.duration > 0 && movie.duration && movie.duration !== 'N/A') {
    const match = movie.duration.match(/(\d+)/);
    if (match) {
      const movieDuration = parseInt(match[1], 10);
      const difference = Math.abs(userPrefs.duration - movieDuration);
      
      let durationScore = 0;
      if (difference <= 15) durationScore = 1.0;
      else if (difference <= 30) durationScore = 0.8;
      else if (difference <= 45) durationScore = 0.6;
      else if (difference <= 60) durationScore = 0.4;
      else if (difference <= 90) durationScore = 0.2;
      
      totalScore += durationScore * 0.10;
      maxPossibleScore += 0.10;
    }
  }
  
  return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
}

async function testImprovedSimilarity() {
  console.log('🎬 Testing Improved Similarity Algorithm');
  console.log('========================================\n');

  try {
    // Get user movies to create preferences
    const { data: userMovies, error: userError } = await supabase
      .from('movie_metadata')
      .select('*')
      .neq('user_id', '00000000-0000-0000-0000-000000000000')
      .limit(10);

    if (userError || !userMovies || userMovies.length === 0) {
      console.log('No user movies found. Testing with system movies...');
      
      const { data: systemMovies, error: systemError } = await supabase
        .from('movie_metadata')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .limit(5);

      if (systemError || !systemMovies) {
        console.error('❌ Failed to fetch any movies:', systemError);
        return;
      }

      // Create user preferences from system movies
      const userPreferences = {
        genres: {},
        actors: {},
        directors: {},
        duration: 0,
        totalMovies: systemMovies.length
      };

      let totalDuration = 0;
      let durationCount = 0;

      systemMovies.forEach(movie => {
        // Aggregate genres
        if (movie.genre && movie.genre !== 'N/A') {
          movie.genre.split(",").forEach(g => {
            const genre = g.trim();
            if (genre !== 'N/A') {
              userPreferences.genres[genre] = (userPreferences.genres[genre] || 0) + 1;
            }
          });
        }

        // Aggregate actors
        if (movie.cast && movie.cast !== 'N/A') {
          movie.cast.split(",").slice(0, 3).forEach(a => {
            const actor = a.trim();
            if (actor !== 'N/A') {
              userPreferences.actors[actor] = (userPreferences.actors[actor] || 0) + 1;
            }
          });
        }

        // Aggregate directors
        if (movie.director && movie.director !== 'N/A') {
          movie.director.split(",").forEach(d => {
            const director = d.trim();
            if (director !== 'N/A') {
              userPreferences.directors[director] = (userPreferences.directors[director] || 0) + 1;
            }
          });
        }

        // Aggregate duration
        if (movie.duration && movie.duration !== 'N/A') {
          const match = movie.duration.match(/(\d+)/);
          if (match) {
            totalDuration += parseInt(match[1], 10);
            durationCount += 1;
          }
        }
      });

      userPreferences.duration = durationCount > 0 ? totalDuration / durationCount : 0;

      console.log('👤 User Preferences:');
      console.log('Genres:', Object.keys(userPreferences.genres));
      console.log('Actors:', Object.keys(userPreferences.actors));
      console.log('Directors:', Object.keys(userPreferences.directors));
      console.log('Avg Duration:', Math.round(userPreferences.duration), 'minutes');

      // Get movies for comparison
      const { data: allMovies, error: allError } = await supabase
        .from('movie_metadata')
        .select('*')
        .neq('user_id', '00000000-0000-0000-0000-000000000000')
        .limit(100);

      if (allError || !allMovies) {
        console.error('❌ Failed to fetch movies for comparison:', allError);
        return;
      }

      // Calculate similarities
      const recommendations = allMovies
        .map(movie => {
          const similarity = calculateImprovedSimilarity(userPreferences, movie);
          return { movie, similarity };
        })
        .filter(rec => rec.similarity > 0.05)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 15);

      console.log('\n🎯 Top 15 Recommendations (Improved Algorithm):');
      recommendations.forEach((rec, index) => {
        const percentage = Math.round(rec.similarity * 100);
        const matchLevel = percentage >= 80 ? '🔥 EXCELLENT' : 
                          percentage >= 60 ? '⭐ GREAT' : 
                          percentage >= 40 ? '👍 GOOD' : 
                          percentage >= 20 ? '✅ FAIR' : '📊 LOW';
        
        console.log(`\n${index + 1}. ${rec.movie.title} - ${percentage}% ${matchLevel}`);
        console.log(`   Genre: ${rec.movie.genre}`);
        console.log(`   Cast: ${rec.movie.cast?.split(",").slice(0, 2).join(", ")}`);
        console.log(`   Director: ${rec.movie.director}`);
        console.log(`   Duration: ${rec.movie.duration}`);
      });

      // Show score distribution
      const scoreRanges = {
        '80-100%': recommendations.filter(r => r.similarity >= 0.8).length,
        '60-79%': recommendations.filter(r => r.similarity >= 0.6 && r.similarity < 0.8).length,
        '40-59%': recommendations.filter(r => r.similarity >= 0.4 && r.similarity < 0.6).length,
        '20-39%': recommendations.filter(r => r.similarity >= 0.2 && r.similarity < 0.4).length,
        '0-19%': recommendations.filter(r => r.similarity < 0.2).length,
      };

      console.log('\n📊 Score Distribution:');
      Object.entries(scoreRanges).forEach(([range, count]) => {
        console.log(`${range}: ${count} movies`);
      });

      console.log('\n✅ Improved similarity algorithm test completed!');
      console.log(`📈 Average similarity: ${Math.round(recommendations.reduce((sum, r) => sum + r.similarity, 0) / recommendations.length * 100)}%`);
      console.log(`🎬 Highest similarity: ${Math.round(recommendations[0]?.similarity * 100)}%`);

    } else {
      console.log('✅ Found user movies for testing');
      console.log(`Total user movies: ${userMovies.length}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImprovedSimilarity().catch(console.error); 