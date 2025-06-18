import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: number; // Percentage (0-100)
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  if (progress === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-4 p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Processing titles...</span>
        <span className="text-sm text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} className="mb-2" />
      <div className="text-xs text-gray-500 text-center">
        Please wait while we analyze your viewing history...
      </div>
    </div>
  );
} 