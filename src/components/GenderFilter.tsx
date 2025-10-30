import React from 'react';
import { getAdultAvatars, getAdultAvatarsByGender } from '@/utils/avatarConfig';

interface GenderFilterProps {
  currentFilter: 'all' | 'male' | 'female';
  onFilterChange: (filter: 'all' | 'male' | 'female') => void;
}

export default function GenderFilter({ currentFilter, onFilterChange }: GenderFilterProps) {
  const filterOptions = [
    { key: 'all' as const, label: 'すべて', count: getAdultAvatars().length },
    { key: 'male' as const, label: '男性', count: getAdultAvatarsByGender('male').length },
    { key: 'female' as const, label: '女性', count: getAdultAvatarsByGender('female').length }
  ];

  return (
    <div className="flex space-x-4 mb-6">
      {filterOptions.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            currentFilter === key 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-black hover:bg-gray-300'
          }`}
        >
          {label} ({count}体)
        </button>
      ))}
    </div>
  );
}