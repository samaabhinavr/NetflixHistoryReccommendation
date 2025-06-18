"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Film, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Features */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              AI-Powered Recommendations
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Discover Your Next Favorite Movie
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Get personalized movie recommendations based on your Netflix viewing history. 
              Our AI analyzes your preferences to suggest movies you&apos;ll love.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg border border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Smart Analysis</h3>
                <p className="text-gray-600 text-sm">
                  We analyze your viewing patterns, favorite genres, actors, and directors to understand your taste.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg border border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Personalized Recommendations</h3>
                <p className="text-gray-600 text-sm">
                  Get movie suggestions with similarity scores and detailed explanations of why each movie matches your taste.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg border border-red-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Easy Setup</h3>
                <p className="text-gray-600 text-sm">
                  Simply upload your Netflix viewing history CSV file and let our AI do the rest. No complex setup required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Film className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to access your personalized movie recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#dc2626',
                      brandAccent: '#b91c1c',
                    },
                  },
                },
              }}
              providers={["google"]}
              theme="light"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 