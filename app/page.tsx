"use client";

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { parseCSVFile, type ParsedCSVData } from '@/lib/csv-parser';
import { MovieList } from '@/components/movie-list';
import { MovieMetadataList } from '@/components/movie-metadata';
import UserPreferences from '@/components/UserPreferences';
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
  const [progress, setProgress] = useState({ current: 0, total: 0, batch: 0, totalBatches: 0 });

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
        return 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100';
    }
  };

  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Process a single title
  const processTitle = async (cleanedTitle: string, originalTitle: string): Promise<MovieMetadata | null> => {
    try {
      // Check if metadata already exists in Supabase (by original title and user_id)
      const { data: existingData } = await supabase
        .from('movie_metadata')
        .select('*')
        .eq('title', originalTitle)
        .eq('user_id', session!.user.id)
        .single();

      if (existingData) {
        return existingData;
      }

      // Fetch from OMDB using cleaned title
      const omdbData = await fetchMovieDetails(cleanedTitle);
      
      const movieMetadata: MovieMetadata = {
        user_id: session!.user.id,
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
    if (!session) return;
    setIsLoading(true);
    setMetadata([]);
    setPreferences(null);
    
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

    // Configure parallel processing
    const BATCH_SIZE = 25; // Increased from 15 to 25 concurrent requests
    const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds
    const totalBatches = Math.ceil(uniqueCleanedTitles.length / BATCH_SIZE);
    
    setProgress({ current: 0, total: uniqueCleanedTitles.length, batch: 0, totalBatches });

    // Process in batches
    for (let i = 0; i < uniqueCleanedTitles.length; i += BATCH_SIZE) {
      const batch = uniqueCleanedTitles.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      setProgress(prev => ({ ...prev, batch: batchNumber }));
      
      // Process batch in parallel
      const batchPromises = batch.map(([cleanedTitle, originalTitle]) => 
        processTitle(cleanedTitle, originalTitle)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Add successful results to metadata
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          newMetadata.push(result.value);
        }
      });
      
      // Update progress
      setProgress(prev => ({ 
        ...prev, 
        current: Math.min(i + BATCH_SIZE, uniqueCleanedTitles.length) 
      }));
      
      // Update metadata state with current results
      setMetadata([...newMetadata]);
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < uniqueCleanedTitles.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    setIsLoading(false);
    setProgress({ current: 0, total: 0, batch: 0, totalBatches: 0 });
    
    // Aggregate preferences after fetching metadata
    const aggregated = aggregatePreferences(newMetadata);
    setPreferences(aggregated);
  };

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  if (!session) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CSV Movie Parser</h1>
          <p className="text-lg text-gray-600">Upload your CSV file to extract and display movie & show titles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl">Upload CSV File</CardTitle>
                <CardDescription className="text-base">
                  Drag and drop your CSV file here, or click to browse
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Upload Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${getStatusColor()}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center space-y-4">
                    {getStatusIcon()}
                    
                    <div className="space-y-2">
                      {uploadState.status === 'idle' && (
                        <>
                          <p className="text-lg font-medium text-gray-700">
                            Drop your CSV file here
                          </p>
                          <p className="text-sm text-gray-500">
                            or click to browse files
                          </p>
                        </>
                      )}
                      
                      {uploadState.status === 'uploading' && (
                        <p className="text-lg font-medium text-blue-600">
                          Parsing CSV file...
                        </p>
                      )}
                      
                      {uploadState.status === 'success' && uploadState.file && (
                        <>
                          <p className="text-lg font-medium text-green-600">
                            File parsed successfully!
                          </p>
                          <div className="flex items-center justify-center space-x-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {uploadState.file.name}
                            </Badge>
                            <Badge variant="outline">
                              {(uploadState.file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                        </>
                      )}
                      
                      {uploadState.status === 'error' && (
                        <p className="text-lg font-medium text-red-600">
                          Upload failed
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Alert */}
                {uploadState.error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      {uploadState.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* File Preview */}
                {uploadState.preview && uploadState.status === 'success' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">File Preview</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {uploadState.preview.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50 font-medium' : 'hover:bg-gray-50'}>
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-4 py-2 border-r last:border-r-0 border-gray-200">
                                    {cell || '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {uploadState.preview.length >= 5 && (
                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                          Showing first 4 data rows of your CSV file
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {(uploadState.status === 'success' || uploadState.status === 'error') && (
                  <div className="flex justify-center">
                    <Button onClick={resetUpload} variant="outline" className="px-6">
                      Upload Another File
                    </Button>
                  </div>
                )}

                {/* File Format Info */}
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <h4 className="font-semibold mb-2">Supported Format:</h4>
                  <ul className="space-y-1">
                    <li>• CSV files with .csv extension</li>
                    <li>• Maximum file size: 10MB</li>
                    <li>• Headers with movie/show titles (title, name, movie, show, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movie List Section */}
          <div>
            {uploadState.parsedData ? (
              <>
                <div className="mb-8">
                  <MovieList 
                    titles={titles} 
                    totalCount={uploadState.parsedData.data.length}
                  />
                </div>
                <div className="mb-4">
                  <Button
                    onClick={fetchAndStoreMetadata}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching Metadata...
                      </>
                    ) : (
                      'Fetch Movie Metadata'
                    )}
                  </Button>
                </div>
                {isLoading && <ProgressIndicator progress={progress} />}
                {metadata.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-2xl font-bold">Movie Metadata</h2>
                    <UserPreferences preferences={preferences} />
                    <MovieMetadataList metadata={metadata} />
                  </div>
                )}
              </>
            ) : (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No File Uploaded</h3>
                  <p className="text-gray-500">
                    Upload a CSV file to see the extracted movie and show titles here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}