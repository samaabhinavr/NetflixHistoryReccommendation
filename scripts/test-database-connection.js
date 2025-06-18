const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Key:', supabaseKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    
    // Test basic query
    const { data, error } = await supabase
      .from('movie_metadata')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test user metadata query
    console.log('\n2. Testing user metadata query...');
    const { data: userData, error: userError } = await supabase
      .from('movie_metadata')
      .select('*')
      .limit(5);
    
    if (userError) {
      console.error('User metadata query failed:', userError);
      return;
    }
    
    console.log(`✅ Found ${userData.length} movie records in database`);
    
    if (userData.length > 0) {
      console.log('Sample record:', userData[0]);
    }
    
    // Test movies table
    console.log('\n3. Testing movies table...');
    const { data: moviesData, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .limit(5);
    
    if (moviesError) {
      console.error('Movies table query failed:', moviesError);
      return;
    }
    
    console.log(`✅ Found ${moviesData.length} movies in database`);
    
    if (moviesData.length > 0) {
      console.log('Sample movie:', moviesData[0]);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection(); 