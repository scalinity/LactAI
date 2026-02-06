import React from 'react';

interface UnitToggleProps {
  isMetric: boolean;
  onChange: (isMetric: boolean) => void;
  className?: string;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({ isMetric, onChange, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={() => onChange(false)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          !isMetric
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        oz
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isMetric
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        ml
      </button>
    </div>
  );
};
