import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PageWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  fallbackClassName?: string;
}

export default function PageWrapper({ 
  children, 
  loadingMessage = "読み込み中...",
  fallbackClassName 
}: PageWrapperProps) {
  return (
    <Suspense 
      fallback={
        <LoadingSpinner 
          message={loadingMessage} 
          className={fallbackClassName}
        />
      }
    >
      {children}
    </Suspense>
  );
}