import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SupabaseProvider from '@/components/SupabaseProvider';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Netflix Movie Recommendations',
  description: 'Get personalized movie recommendations based on your Netflix viewing history',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <Navigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </SupabaseProvider>
      </body>
    </html>
  );
}