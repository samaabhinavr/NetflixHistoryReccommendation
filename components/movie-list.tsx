'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Tv, Star } from 'lucide-react';

interface MovieListProps {
  titles: string[];
  totalCount: number;
}

export function MovieList({ titles, totalCount }: MovieListProps) {
  if (titles.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Film className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-xl text-gray-600">No Titles Found</CardTitle>
          <CardDescription>
            We couldn&apos;t find any movie or show titles in your CSV file. 
            Make sure your file has a column with titles like &quot;title&quot;, &quot;name&quot;, &quot;movie&quot;, or &quot;show&quot;.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Film className="h-5 w-5 text-blue-600" />
              <Tv className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Movie & Show Titles</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {totalCount} {totalCount === 1 ? 'title' : 'titles'} found
          </Badge>
        </div>
        <CardDescription>
          Extracted from your CSV file
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96 w-full rounded-md border bg-gray-50/50 p-4">
          <div className="space-y-2">
            {titles.map((title, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 leading-tight">
                      {title}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  #{index + 1}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {titles.length < totalCount && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Showing {titles.length} unique titles out of {totalCount} total entries.
              Duplicates have been removed for clarity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}