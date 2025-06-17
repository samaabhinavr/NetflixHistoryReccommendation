import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CSV File Upload - Secure & Fast',
  description: 'Upload and validate CSV files with our secure, fast, and user-friendly interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabaseClient] = useState(() => createBrowserClient())
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionContextProvider supabaseClient={supabaseClient}>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}