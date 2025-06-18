import React from "react";
import type { AggregatedPreferences } from "@/lib/recommendation";

interface UserPreferencesProps {
  preferences: AggregatedPreferences | null;
}

export default function UserPreferences({ preferences }: UserPreferencesProps) {
  if (!preferences) return null;

  // Get top N most common items
  const getTopN = (counts: Record<string, number>, n: number) => {
    const entries = Object.entries(counts);
    if (entries.length === 0) return [];
    return entries
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, n)
      .map(([item, count]) => ({ item, count }));
  };

  const topGenres = getTopN(preferences.genreCounts, 3);
  
  // Filter out "N/A" from actor counts before getting top actors
  const filteredActorCounts = { ...preferences.actorCounts };
  delete filteredActorCounts["N/A"];
  const topActors = getTopN(filteredActorCounts, 3);
  
  // Filter out "N/A" from director counts before getting top director
  const filteredDirectorCounts = { ...preferences.directorCounts };
  delete filteredDirectorCounts["N/A"];
  const topDirectors = getTopN(filteredDirectorCounts, 1); // Just the most common director
  
  const avgDuration = preferences.averageDuration;
  const durationLabel = avgDuration > 90 ? "Above 90 min" : "90 min or less";

  return (
    <div className="rounded-lg border bg-white p-4 shadow-md mb-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Your Viewing Preferences</h2>
      <div className="space-y-4">
        <div>
          <strong>Top 3 Genres:</strong>
          <ul className="ml-4 mt-1">
            {topGenres.map((genre, index) => (
              <li key={genre.item}>
                {index + 1}. {genre.item} ({genre.count} times)
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Top 3 Actors:</strong>
          <ul className="ml-4 mt-1">
            {topActors.map((actor, index) => (
              <li key={actor.item}>
                {index + 1}. {actor.item} ({actor.count} times)
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Most Common Director:</strong>
          <div className="ml-4 mt-1">
            {topDirectors.length > 0 ? (
              <span>{topDirectors[0].item} ({topDirectors[0].count} times)</span>
            ) : (
              <span>N/A</span>
            )}
          </div>
        </div>
        <div>
          <strong>Average Duration:</strong> {avgDuration.toFixed(1)} min ({durationLabel})
        </div>
      </div>
    </div>
  );
} 