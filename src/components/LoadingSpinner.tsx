import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  message = "読み込み中...", 
  className = "min-h-screen bg-gray-100" 
}: LoadingSpinnerProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}