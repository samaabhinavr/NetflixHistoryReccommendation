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

    setLoading(true);
    setError(null);

    try {
      // Fetch user's viewing history
      const userMetadata = await fetchUserMetadata(session.user.id);
      
      // Aggregate user preferences
      const userPreferences = aggregatePreferences(userMetadata);
      setPreferences(userPreferences);

      // Generate recommendations
      const recs = await generateRecommendations(session.user.id, userPreferences, 10);
      
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
      
      setRecommendations(recommendationsWithPosters);
    } catch (err) {
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
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={rec.movie.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Poster */}
                    {rec.posterUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={rec.posterUrl} 
                          alt={`${rec.movie.title} poster`}
                          className="w-16 h-24 object-cover rounded-md shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">
                          {index + 1}. {rec.movie.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(rec.movie.duration)}
                        </Badge>
                      </div>
                      
                      {/* Genres */}
                      {rec.movie.genre && rec.movie.genre !== 'N/A' && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.movie.genre.split(",").map((genre, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {genre.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Cast and Director */}
                      <div className="text-sm text-muted-foreground mb-2">
                        {rec.movie.cast && rec.movie.cast !== 'N/A' && (
                          <p><span className="font-medium">Cast:</span> {rec.movie.cast.split(",").slice(0, 3).join(", ")}</p>
                        )}
                        {rec.movie.director && rec.movie.director !== 'N/A' && (
                          <p><span className="font-medium">Director:</span> {rec.movie.director}</p>
                        )}
                      </div>

                      {/* Reasoning */}
                      <p className="text-sm text-blue-600 font-medium">{rec.reason}</p>
                    </div>

                    {/* Similarity Score */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getSimilarityColor(rec.similarity)}`}>
                          {getSimilarityText(rec.similarity)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(rec.similarity * 100)}% match
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 