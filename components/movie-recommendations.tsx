"use client";

import { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  generateRecommendations, 
  fetchUserMetadata, 
  aggregatePreferences,
  type AggregatedPreferences 
} from "@/lib/recommendation";
import type { MovieMetadata } from "@/lib/supabase";
import { fetchMovieDetails } from "@/lib/omdb-service";

interface Recommendation {
  movie: MovieMetadata;
  similarity: number;
  reason: string;
  posterUrl?: string;
}

export default function MovieRecommendations() {
  const session = useSession();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AggregatedPreferences | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadRecommendations();
    }
  }, [session]);

  const loadRecommendations = async () => {
    if (!session?.user) return;

    console.log('Loading recommendations for user:', session.user.id);
    setLoading(true);
    setError(null);

    try {
      // Fetch user's viewing history
      console.log('Fetching user metadata...');
      const userMetadata = await fetchUserMetadata(session.user.id);
      console.log('Fetched user metadata:', userMetadata.length, 'movies');
      
      // Aggregate user preferences
      const userPreferences = aggregatePreferences(userMetadata);
      console.log('Aggregated preferences:', userPreferences);
      setPreferences(userPreferences);

      // Generate recommendations
      console.log('Generating recommendations...');
      const recs = await generateRecommendations(session.user.id, userPreferences, 10);
      console.log('Generated recommendations:', recs.length);
      
      // Fetch posters for recommendations
      const recommendationsWithPosters = await Promise.all(
        recs.map(async (rec) => {
          try {
            const omdbData = await fetchMovieDetails(rec.movie.title);
            return {
              ...rec,
              posterUrl: omdbData.Poster !== 'N/A' ? omdbData.Poster : undefined
            };
          } catch (error) {
            console.warn(`Failed to fetch poster for ${rec.movie.title}:`, error);
            return rec;
          }
        })
      );
      
      console.log('Final recommendations with posters:', recommendationsWithPosters.length);
      setRecommendations(recommendationsWithPosters);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
    }
    return duration;
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return "bg-green-500";
    if (similarity >= 0.6) return "bg-blue-500";
    if (similarity >= 0.4) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getSimilarityText = (similarity: number) => {
    if (similarity >= 0.8) return "Excellent Match";
    if (similarity >= 0.6) return "Great Match";
    if (similarity >= 0.4) return "Good Match";
    return "Fair Match";
  };

  // Helper function to get match level and color
  function getMatchLevel(similarity: number) {
    const percentage = Math.round(similarity * 100);
    if (percentage >= 80) return { level: '🔥 EXCELLENT', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (percentage >= 60) return { level: '⭐ GREAT', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (percentage >= 40) return { level: '👍 GOOD', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (percentage >= 20) return { level: '✅ FAIR', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { level: '📊 LOW', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }

  // Helper function to get match reason
  function getMatchReason(movie: MovieMetadata, userPreferences: AggregatedPreferences): string {
    const reasons: string[] = [];
    
    // Check genre matches
    if (movie.genre && movie.genre !== 'N/A') {
      const movieGenres = movie.genre.split(",").map(g => g.trim());
      const matchingGenres = Object.keys(userPreferences.genreCounts).filter(g => movieGenres.includes(g));
      if (matchingGenres.length > 0) {
        reasons.push(`${matchingGenres.length} genre match${matchingGenres.length > 1 ? 'es' : ''}: ${matchingGenres.slice(0, 2).join(", ")}`);
      }
    }
    
    // Check actor matches
    if (movie.cast && movie.cast !== 'N/A') {
      const movieActors = movie.cast.split(",").map(a => a.trim());
      const matchingActors = Object.keys(userPreferences.actorCounts).filter(a => movieActors.includes(a));
      if (matchingActors.length > 0) {
        reasons.push(`${matchingActors.length} actor match${matchingActors.length > 1 ? 'es' : ''}: ${matchingActors.slice(0, 2).join(", ")}`);
      }
    }
    
    // Check director matches
    if (movie.director && movie.director !== 'N/A') {
      const movieDirectors = movie.director.split(",").map(d => d.trim());
      const matchingDirectors = Object.keys(userPreferences.directorCounts).filter(d => movieDirectors.includes(d));
      if (matchingDirectors.length > 0) {
        reasons.push(`${matchingDirectors.length} director match${matchingDirectors.length > 1 ? 'es' : ''}: ${matchingDirectors.slice(0, 2).join(", ")}`);
      }
    }
    
    return reasons.length > 0 ? reasons.join(", ") : "Similar content style";
  }

  if (!session?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movie Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to see personalized recommendations.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movie Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Analyzing your viewing history...</span>
            </div>
            <Progress value={33} className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movie Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadRecommendations} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Preferences Summary */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle>Your Viewing Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Movies</p>
                <p className="text-2xl font-bold">{preferences.totalMovies}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{Math.round(preferences.averageDuration)}m</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Genre</p>
                <p className="text-lg font-semibold">
                  {Object.entries(preferences.genreCounts)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Favorite Actor</p>
                <p className="text-lg font-semibold">
                  {Object.entries(preferences.actorCounts)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recommended for You</CardTitle>
            <Button onClick={loadRecommendations} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground">
              No recommendations available. Try uploading more movies to your viewing history.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((rec, index) => {
                const matchInfo = getMatchLevel(rec.similarity);
                const matchReason = preferences ? getMatchReason(rec.movie, preferences) : "Based on your viewing history";
                
                return (
                  <Card key={rec.movie.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {rec.posterUrl && (
                        <img
                          src={rec.posterUrl}
                          alt={rec.movie.title}
                          className="w-full h-64 object-cover"
                        />
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${matchInfo.bgColor} ${matchInfo.color}`}>
                        {Math.round(rec.similarity * 100)}%
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-2">{rec.movie.title}</h3>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {matchInfo.level}
                          </Badge>
                        </div>
                        
                        {rec.movie.genre && rec.movie.genre !== 'N/A' && (
                          <div className="flex flex-wrap gap-1">
                            {rec.movie.genre.split(",").slice(0, 3).map((genre, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {genre.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          {rec.movie.cast && rec.movie.cast !== 'N/A' && (
                            <p className="line-clamp-1">
                              <span className="font-medium">Cast:</span> {rec.movie.cast.split(",").slice(0, 2).join(", ")}
                            </p>
                          )}
                          {rec.movie.director && rec.movie.director !== 'N/A' && (
                            <p className="line-clamp-1">
                              <span className="font-medium">Director:</span> {rec.movie.director}
                            </p>
                          )}
                          {rec.movie.duration && rec.movie.duration !== 'N/A' && (
                            <p>
                              <span className="font-medium">Duration:</span> {rec.movie.duration}
                            </p>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 line-clamp-2">
                            <span className="font-medium">Why recommended:</span> {matchReason}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 