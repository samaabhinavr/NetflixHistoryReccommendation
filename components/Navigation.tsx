"use client";

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  Download, 
  FileText, 
  Settings, 
  User, 
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Navigation() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const netflixInstructions = [
    {
      step: 1,
      title: "Log in to Netflix on a Web Browser",
      description: "Open your preferred web browser (Chrome, Edge, Firefox, etc.) and go to netflix.com to sign in to your account",
      action: "Visit netflix.com and sign in"
    },
    {
      step: 2,
      title: "Open Your Profile",
      description: "If your account has multiple profiles, click on your profile icon and select your profile",
      action: "Select your profile"
    },
    {
      step: 3,
      title: "Access Account Settings",
      description: "Hover over your profile icon in the top-right corner and click on Account in the dropdown menu",
      action: "Click Account in dropdown"
    },
    {
      step: 4,
      title: "Go to Your Profile's Viewing Activity",
      description: "Scroll down to the Profile & Parental Controls section, find your profile, click the down arrow to expand, then click on Viewing activity",
      action: "Click Viewing activity"
    },
    {
      step: 5,
      title: "Download All Viewing History",
      description: "On the Viewing activity page, scroll to the bottom and click on Download all (or 'Download all viewing activity')",
      action: "Click Download all"
    },
    {
      step: 6,
      title: "Locate and Save the Downloaded File",
      description: "The CSV file will be saved to your computer's 'Downloads' folder with a name like NetflixViewingHistory.csv",
      action: "Find file in Downloads folder"
    },
    {
      step: 7,
      title: "Upload the File",
      description: "Return to our website/app and use the provided upload button to select and upload your Netflix viewing history CSV file",
      action: "Upload file to our app"
    }
  ];

  if (!session?.user) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                🎬 Netflix Recommendations
              </h1>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            {/* Netflix Instructions Button */}
            <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  How to Download
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    How to Download Your Netflix Viewing History
                  </DialogTitle>
                  <DialogDescription>
                    Follow these steps to get your viewing history from Netflix and upload it here for personalized recommendations.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {netflixInstructions.map((instruction) => (
                    <Card key={instruction.step} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Badge variant="secondary" className="flex-shrink-0">
                            Step {instruction.step}
                          </Badge>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{instruction.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{instruction.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <FileText className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">{instruction.action}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm text-blue-900 mb-2">
                        💡 Pro Tips:
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• This method downloads your viewing history instantly</li>
                        <li>• The CSV file contains all your viewing activity</li>
                        <li>• Make sure you&apos;re logged into the correct Netflix profile</li>
                        <li>• The file will be named something like &quot;NetflixViewingHistory.csv&quot;</li>
                        <li>• You can download this data as often as you want</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {session.user.email?.split('@')[0] || 'User'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 text-sm text-gray-500 border-b">
                  Signed in as {session.user.email}
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
} 