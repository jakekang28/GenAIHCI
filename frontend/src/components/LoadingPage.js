import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingPage = ({
  type = 'ai-evaluation',
  title = 'Loading...',
  subtitle = ''
}) => {
  const getBackgroundGradient = () => {
    switch (type) {
      case 'ai-evaluation':
        return 'bg-gradient-to-br from-indigo-50 to-purple-100';
      case 'chat':
        return 'bg-gradient-to-br from-blue-50 to-cyan-100';
      case 'hmw':
        return 'bg-gradient-to-br from-emerald-50 to-teal-100';
      default:
        return 'bg-gradient-to-br from-gray-50 to-blue-100';
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundGradient()} p-6 flex items-center justify-center`}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <LoadingSpinner
          type={type}
          message={title}
          size="large"
        />
        
        {subtitle && (
          <p className="text-gray-600 mt-4">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingPage; 