const fs = require('fs');
const path = require('path');

console.log('🎬 TMDB Database Population Setup');
console.log('==================================\n');

// Check if CSV files exist
const moviesFile = 'tmdb_5000_movies.csv';
const creditsFile = 'tmdb_5000_credits.csv';

if (!fs.existsSync(moviesFile)) {
  console.error(`❌ Error: ${moviesFile} not found in the current directory`);
  console.log('Please make sure the TMDB CSV files are in the project root directory.\n');
  process.exit(1);
}

if (!fs.existsSync(creditsFile)) {
  console.error(`❌ Error: ${creditsFile} not found in the current directory`);
  console.log('Please make sure the TMDB CSV files are in the project root directory.\n');
  process.exit(1);
}

console.log('✅ TMDB CSV files found');
console.log(`   - ${moviesFile}`);
console.log(`   - ${creditsFile}\n`);

// Check if Supabase credentials are configured
const populateScript = 'scripts/populate-database.js';
let populateContent = fs.readFileSync(populateScript, 'utf8');

if (populateContent.includes('your-project.supabase.co') || populateContent.includes('your-anon-key')) {
  console.log('⚠️  Supabase credentials need to be configured');
  console.log('\nTo configure your Supabase credentials:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy your Project URL and anon/public key');
  console.log('4. Edit scripts/populate-database.js and replace:');
  console.log('   - "your-project.supabase.co" with your actual Project URL');
  console.log('   - "your-anon-key" with your actual anon/public key\n');
  
  console.log('Example:');
  console.log('const supabaseUrl = "https://abcdefghijklmnop.supabase.co";');
  console.log('const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";\n');
  
  console.log('After configuring the credentials, run:');
  console.log('node scripts/populate-database.js\n');
} else {
  console.log('✅ Supabase credentials appear to be configured');
  console.log('\nTo populate the database, run:');
  console.log('node scripts/populate-database.js\n');
}

console.log('📊 What this script will do:');
console.log('- Read and parse the TMDB CSV files');
console.log('- Extract movie metadata (title, genres, cast, director, duration)');
console.log('- Filter out invalid or incomplete entries');
console.log('- Insert valid movies into your Supabase database');
console.log('- Use a system user ID (00000000-0000-0000-0000-000000000000) for the data');
console.log('- Process movies in batches of 50 to avoid overwhelming the database\n');

console.log('⚠️  Important notes:');
console.log('- This will add approximately 4,000+ movies to your database');
console.log('- The movies will be associated with a system user ID');
console.log('- Your recommendation engine will use this data for better suggestions');
console.log('- Make sure your Supabase database has enough storage space\n');

console.log('🚀 Ready to proceed? Configure your credentials and run the population script!'); 