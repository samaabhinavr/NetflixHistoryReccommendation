"use client";

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2, Sparkles, TrendingUp, User } from 'lucide-react';
import { parseCSVFile, type ParsedCSVData } from '@/lib/csv-parser';
import { MovieList } from '@/components/movie-list';
import { MovieMetadataList } from '@/components/movie-metadata';
import UserPreferences from '@/components/UserPreferences';
import MovieRecommendations from '@/components/movie-recommendations';
import { supabase } from '@/lib/supabase';
import { fetchMovieDetails } from '@/lib/omdb-service';
import { aggregatePreferences, type AggregatedPreferences } from '@/lib/recommendation';
import type { MovieMetadata } from '@/lib/supabase';
import { cleanTitleForOMDB } from '@/lib/utils';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import ProgressIndicator from '@/components/ProgressIndicator';

interface FileUploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
  preview: string[][] | null;
  parsedData: ParsedCSVData | null;
}

export default function Home() {
  const session = useSession();
  const router = useRouter();

  // All hooks must be called before any return
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    status: 'idle',
    error: null,
    preview: null,
    parsedData: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<MovieMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<AggregatedPreferences | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // All callbacks must be defined after hooks, before any return
  const validateCSVFile = (file: File): string | null => {
    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      return 'File must have a .csv extension';
    }

    // Check MIME type
    const validMimeTypes = ['text/csv', 'text/plain', 'application/csv'];
    if (!validMimeTypes.includes(file.type) && file.type !== '') {
      return 'Invalid file type. Please upload a CSV file';
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const parseCSVPreview = (data: any[], headers: string[]): string[][] => {
    const preview = [headers];
    const dataRows = data.slice(0, 4).map(row => 
      headers.map(header => row[header] || '—')
    );
    return [...preview, ...dataRows];
  };

  const handleFile = useCallback(async (file: File) => {
    setUploadState({
      file: null,
      status: 'uploading',
      error: null,
      preview: null,
      parsedData: null,
    });

    // Validate file
    const validationError = validateCSVFile(file);
    if (validationError) {
      setUploadState({
        file: null,
        status: 'error',
        error: validationError,
        preview: null,
        parsedData: null,
      });
      return;
    }

    try {
      // Parse CSV file using Papa Parse
      const parseResult = await parseCSVFile(file);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse CSV file');
      }

      const { data: parsedData } = parseResult;
      
      if (!parsedData) {
        throw new Error('No data found in CSV file');
      }

      // Create preview from parsed data
      const preview = parseCSVPreview(parsedData.data, parsedData.headers);

      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      setUploadState({
        file,
        status: 'success',
        error: null,
        preview,
        parsedData,
      });

      setTitles(parsedData.data.map(row => row[parsedData.headers[0]] as string));
    } catch (error) {
      setUploadState({
        file: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process CSV file',
        preview: null,
        parsedData: null,
      });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const resetUpload = () => {
    setUploadState({
      file: null,
      status: 'idle',
      error: null,
      preview: null,
      parsedData: null,
    });
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
        return <Upload className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <FileText className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (isDragOver) return 'border-blue-400 bg-blue-50';
    switch (uploadState.status) {
      case 'uploading':
        return 'border-blue-300 bg-blue-50';
      case 'success':
        return 'border-green-300 bg-green-50';
      case 'error':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Process a single title
  const processTitle = async (cleanedTitle: string, originalTitle: string, userId: string): Promise<MovieMetadata | null> => {
    try {
      // Check if metadata already exists in Supabase (by original title and user_id)
      const { data: existingData } = await supabase
        .from('movie_metadata')
        .select('*')
        .eq('title', originalTitle)
        .eq('user_id', userId)
        .single();

      if (existingData) {
        return existingData;
      }

      // Fetch from OMDB using cleaned title
      const omdbData = await fetchMovieDetails(cleanedTitle);
      
      const movieMetadata: MovieMetadata = {
        user_id: userId,
        title: originalTitle,
        genre: omdbData.Genre,
        cast: omdbData.Actors,
        director: omdbData.Director,
        duration: omdbData.Runtime,
        poster_url: omdbData.Poster !== 'N/A' ? omdbData.Poster : undefined
      };

      // Store in Supabase
      const { data, error } = await supabase
        .from('movie_metadata')
        .insert([movieMetadata])
        .select()
        .single();

      if (error) {
        console.error(`Error storing metadata for ${originalTitle}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error processing ${originalTitle}:`, error);
      return null;
    }
  };

  const fetchAndStoreMetadata = async () => {
    if (!session) {
      console.error('No session available');
      return;
    }
    
    console.log('Starting metadata fetch for user:', session.user.id);
    setIsLoading(true);
    setMetadata([]);
    setPreferences(null);
    setError(null);
    
    try {
      const newMetadata: MovieMetadata[] = [];

      // Clean and deduplicate titles
      const cleanedTitleMap = new Map<string, string>();
      for (const originalTitle of titles) {
        const cleaned = cleanTitleForOMDB(originalTitle);
        if (!cleanedTitleMap.has(cleaned)) {
          cleanedTitleMap.set(cleaned, originalTitle);
        }
      }
      const uniqueCleanedTitles = Array.from(cleanedTitleMap.entries());
      console.log('Processing', uniqueCleanedTitles.length, 'unique titles');

      // Configure parallel processing
      const BATCH_SIZE = 25; // Increased from 15 to 25 concurrent requests
      const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
      const DELAY_BETWEEN_REQUESTS = 200; // 200ms delay between individual requests

      let processedCount = 0;
      const totalTitles = uniqueCleanedTitles.length;

      // Process titles in batches
      for (let i = 0; i < uniqueCleanedTitles.length; i += BATCH_SIZE) {
        const batch = uniqueCleanedTitles.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueCleanedTitles.length / BATCH_SIZE)}`);

        // Process batch with delays
        const batchPromises = batch.map(async ([cleanedTitle, originalTitle], index) => {
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, index * DELAY_BETWEEN_REQUESTS));
          
          try {
            const movieData = await processTitle(cleanedTitle, originalTitle, session.user.id);
            if (movieData) {
              newMetadata.push(movieData);
              console.log(`✅ Processed: ${originalTitle}`);
            } else {
              console.log(`❌ Failed to process: ${originalTitle}`);
            }
          } catch (error) {
            console.error(`Error processing ${originalTitle}:`, error);
          }
          
          processedCount++;
          setProgress((processedCount / totalTitles) * 100);
        });

        await Promise.all(batchPromises);

        // Add delay between batches
        if (i + BATCH_SIZE < uniqueCleanedTitles.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      console.log(`Processing complete. Successfully processed ${newMetadata.length} movies.`);

      // Store metadata in database
      if (newMetadata.length > 0) {
        console.log('Storing metadata in database...');
        const { error: insertError } = await supabase
          .from('movie_metadata')
          .insert(newMetadata);

        if (insertError) {
          console.error('Error inserting metadata:', insertError);
          throw new Error(`Failed to store metadata: ${insertError.message}`);
        }
        console.log('Metadata stored successfully');
      }

      // Update state
      setMetadata(newMetadata);
      
      // Calculate preferences
      if (newMetadata.length > 0) {
        const userPreferences = aggregatePreferences(newMetadata);
        console.log('Calculated preferences:', userPreferences);
        setPreferences(userPreferences);
      } else {
        console.warn('No metadata available to calculate preferences');
        setError('No movies were successfully processed. Please check your CSV file format.');
      }

    } catch (error) {
      console.error('Error in fetchAndStoreMetadata:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to Netflix Recommendations
            </CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to get personalized movie recommendations based on your viewing history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Sign In to Continue
            </Button>
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account? 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-red-600 hover:text-red-700"
                  onClick={() => router.push('/login')}
                >
                  Sign up here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          AI-Powered Recommendations
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Discover Your Next Favorite Movie
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload your Netflix viewing history and get personalized movie recommendations 
          based on your taste and preferences.
        </p>
      </div>

      {/* Stats Cards */}
      {metadata.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Movies Processed</p>
                  <p className="text-2xl font-bold text-blue-900">{metadata.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">Recommendations</p>
                  <p className="text-2xl font-bold text-green-900">Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">Your Profile</p>
                  <p className="text-2xl font-bold text-purple-900">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        {/* File Upload Section */}
        {uploadState.status === 'idle' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Upload Your Netflix History</CardTitle>
              <CardDescription>
                Drag and drop your Netflix viewing history CSV file or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${getStatusColor()}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  {getStatusIcon()}
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragOver ? 'Drop your file here' : 'Upload your CSV file'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or drag and drop your Netflix viewing history CSV file
                    </p>
                  </div>
                  <Button onClick={() => document.getElementById('file-upload')?.click()}>
                    Choose File
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Section */}
        {uploadState.status === 'uploading' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Processing Your File</CardTitle>
              <CardDescription>Please wait while we analyze your viewing history</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-sm text-gray-600">Validating and parsing your CSV file...</p>
            </CardContent>
          </Card>
        )}

        {/* Success Section */}
        {uploadState.status === 'success' && uploadState.parsedData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  File Uploaded Successfully!
                </CardTitle>
                <CardDescription>
                  Found {uploadState.parsedData.data.length} titles in your viewing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">File: {uploadState.file?.name}</span>
                    <Button variant="outline" size="sm" onClick={resetUpload}>
                      Upload Different File
                    </Button>
                  </div>
                  
                  {uploadState.preview && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-medium text-sm">Preview (First 4 rows)</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {uploadState.preview.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100 font-medium' : ''}>
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-4 py-2 border-b">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={fetchAndStoreMetadata}
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing Movies...
                      </>
                    ) : (
                      'Get Movie Recommendations'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Progress Indicator */}
            {isLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Your Movies</CardTitle>
                  <CardDescription>
                    Fetching movie details and generating recommendations...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressIndicator 
                    progress={progress}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Error Section */}
        {uploadState.status === 'error' && (
          <Card className="max-w-2xl mx-auto border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Upload Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{uploadState.error}</AlertDescription>
              </Alert>
              <Button onClick={resetUpload} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h3 className="font-semibold text-red-900">Error</h3>
              </div>
              <p className="text-red-800 mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results Sections */}
        {metadata.length > 0 && (
          <div className="space-y-8">
            <UserPreferences preferences={preferences} />
            <MovieRecommendations 
              userMetadata={metadata}
              userPreferences={preferences}
            />
          </div>
        )}
      </div>
    </div>
  );
}