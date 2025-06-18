import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: {
    current: number;
    total: number;
    batch: number;
    totalBatches: number;
  };
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  if (progress.total === 0) return null;

  const percentage = (progress.current / progress.total) * 100;

  return (
    <div className="w-full max-w-md mx-auto mb-4 p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Processing titles...</span>
        <span className="text-sm text-gray-500">
          {progress.current} / {progress.total}
        </span>
      </div>
      <Progress value={percentage} className="mb-2" />
      <div className="text-xs text-gray-500 text-center">
        Batch {progress.batch} of {progress.totalBatches}
      </div>
    </div>
  );
} 