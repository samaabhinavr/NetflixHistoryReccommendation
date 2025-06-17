import { MovieMetadata } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MovieMetadataListProps {
  metadata: MovieMetadata[]
}

export function MovieMetadataList({ metadata }: MovieMetadataListProps) {
  return (
    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
      <div className="grid gap-4">
        {metadata.map((movie) => (
          <Card key={movie.title} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">{movie.title}</CardTitle>
              {movie.poster_url && (
                <img
                  src={movie.poster_url}
                  alt={`${movie.title} poster`}
                  className="h-24 w-16 object-cover"
                />
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div>
                  <span className="font-semibold">Genre: </span>
                  {movie.genre}
                </div>
                <div>
                  <span className="font-semibold">Director: </span>
                  {movie.director}
                </div>
                <div>
                  <span className="font-semibold">Cast: </span>
                  {movie.cast}
                </div>
                <div>
                  <span className="font-semibold">Duration: </span>
                  {movie.duration}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
} 