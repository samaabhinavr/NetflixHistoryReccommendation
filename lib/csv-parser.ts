import Papa from 'papaparse';

export interface ParsedCSVData {
  headers: string[];
  data: any[];
  movieTitles: string[];
}

export interface CSVParseResult {
  success: boolean;
  data?: ParsedCSVData;
  error?: string;
}

// Common column names that might contain movie/show titles
const TITLE_COLUMN_PATTERNS = [
  'title',
  'name',
  'movie',
  'show',
  'film',
  'series',
  'program',
  'content',
  'media'
];

function findTitleColumn(headers: string[]): string | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // First, look for exact matches
  for (const pattern of TITLE_COLUMN_PATTERNS) {
    const index = normalizedHeaders.indexOf(pattern);
    if (index !== -1) {
      return headers[index];
    }
  }
  
  // Then, look for partial matches
  for (const pattern of TITLE_COLUMN_PATTERNS) {
    const index = normalizedHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      return headers[index];
    }
  }
  
  // If no title column found, use the first column
  return headers.length > 0 ? headers[0] : null;
}

function extractMovieTitles(data: any[], titleColumn: string): string[] {
  if (!titleColumn || !data.length) return [];
  
  const titles = data
    .map(row => row[titleColumn])
    .filter(title => title && typeof title === 'string' && title.trim().length > 0)
    .map(title => title.trim())
    .filter((title, index, array) => array.indexOf(title) === index); // Remove duplicates
  
  return titles;
}

export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            const criticalErrors = results.errors.filter(error => error.type === 'Delimiter');
            if (criticalErrors.length > 0) {
              resolve({
                success: false,
                error: 'Invalid CSV format: Unable to detect proper delimiter'
              });
              return;
            }
          }

          const headers = results.meta.fields || [];
          const data = results.data as any[];

          if (headers.length === 0) {
            resolve({
              success: false,
              error: 'CSV file appears to have no headers'
            });
            return;
          }

          if (data.length === 0) {
            resolve({
              success: false,
              error: 'CSV file appears to have no data rows'
            });
            return;
          }

          const titleColumn = findTitleColumn(headers);
          const movieTitles = titleColumn ? extractMovieTitles(data, titleColumn) : [];

          resolve({
            success: true,
            data: {
              headers,
              data,
              movieTitles
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse CSV file'
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          error: `CSV parsing error: ${error.message}`
        });
      }
    });
  });
}