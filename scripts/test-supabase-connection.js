const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables (same as your app)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection');
console.log('==============================\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.log('Please make sure you have a .env.local file with:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n');
  process.exit(1);
}

console.log('✅ Supabase credentials found');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔗 Testing connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('movie_metadata')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      
      if (error.message.includes('relation "movie_metadata" does not exist')) {
        console.log('\n💡 The movie_metadata table does not exist.');
        console.log('Please make sure you have created the table in your Supabase database.');
        console.log('You can create it using the SQL editor in your Supabase dashboard:\n');
        console.log(`
CREATE TABLE movie_metadata (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  genre TEXT,
  cast TEXT,
  director TEXT,
  duration TEXT,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
      }
      return false;
    }
    
    console.log('✅ Connection successful!');
    
    // Check table structure
    console.log('\n📊 Checking table structure...');
    const { data: tableData, error: tableError } = await supabase
      .from('movie_metadata')
      .select('*')
      .limit(5);
    
    if (tableError) {
      console.error('❌ Error reading table:', tableError.message);
      return false;
    }
    
    console.log(`✅ Table exists and is accessible`);
    console.log(`📈 Current row count: ${tableData.length} (showing first 5 rows)`);
    
    if (tableData.length > 0) {
      console.log('\n📋 Sample data:');
      console.log(JSON.stringify(tableData[0], null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function main() {
  const success = await testConnection();
  
  if (success) {
    console.log('\n🎉 Supabase connection test passed!');
    console.log('You can now run the TMDB population script.');
  } else {
    console.log('\n❌ Supabase connection test failed.');
    console.log('Please fix the issues above before running the population script.');
  }
}

main().catch(console.error); 