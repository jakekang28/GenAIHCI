import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({
  type = 'default',
  message = 'Loading...',
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const getSpinnerColor = () => {
    switch (type) {
      case 'ai-evaluation':
        return 'text-indigo-600';
      case 'chat':
        return 'text-blue-600';
      case 'hmw':
        return 'text-emerald-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMessageColor = () => {
    switch (type) {
      case 'ai-evaluation':
        return 'text-indigo-700';
      case 'chat':
        return 'text-blue-700';
      case 'hmw':
        return 'text-emerald-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-4">
        <Loader2 className={`${sizeClasses[size]} ${getSpinnerColor()} animate-spin`} />
      </div>
      <div className="text-center">
        <p className={`${getMessageColor()} text-lg font-medium`}>{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner; 