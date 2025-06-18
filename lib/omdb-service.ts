const OMDB_API_KEY = '5c64a789'
const OMDB_BASE_URL = 'https://www.omdbapi.com'
const OMDB_POSTER_URL = 'https://img.omdbapi.com'

export type OMDBResponse = {
  Title: string
  Genre: string
  Actors: string
  Director: string
  Runtime: string
  Poster: string
  Response: string
  Error?: string
}

export async function fetchMovieDetails(title: string): Promise<OMDBResponse> {
  const response = await fetch(
    `${OMDB_BASE_URL}/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch movie details for ${title}`)
  }

  const data = await response.json()
  
  if (data.Response === 'False') {
    throw new Error(data.Error || `No data found for ${title}`)
  }

  return data
}

export function getPosterUrl(imdbId: string): string {
  return `${OMDB_POSTER_URL}/?i=${imdbId}&h=600&apikey=${OMDB_API_KEY}`
} 