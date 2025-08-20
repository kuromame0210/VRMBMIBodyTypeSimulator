import React from 'react';
import { AvatarData } from '@/utils/avatarConfig';

interface AvatarCardProps {
  avatar: AvatarData;
  isSelected: boolean;
  onSelect: (avatar: AvatarData) => void;
  variant?: 'grid' | 'detail';
}

export default function AvatarCard({ 
  avatar, 
  isSelected, 
  onSelect,
  variant = 'grid'
}: AvatarCardProps) {
  if (variant === 'detail') {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={avatar.thumbnailPath}
            alt={avatar.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-avatar.png';
            }}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">
            {avatar.name}
          </h3>
          <p className="text-sm text-gray-600 mb-1">{avatar.description}</p>
          <div className="text-xs text-gray-500">
            性別: {avatar.gender === 'male' ? '男性' : '女性'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(avatar)}
      className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border-3 ${
        isSelected 
          ? 'border-blue-500 ring-4 ring-blue-200 scale-105' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={avatar.thumbnailPath}
            alt={avatar.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-avatar.png';
            }}
          />
        </div>
        
        <h3 className="font-semibold text-gray-800 mb-2 text-center">
          {avatar.name}
        </h3>
        <p className="text-sm text-gray-600 text-center mb-3 line-clamp-2">
          {avatar.description}
        </p>
        
        {isSelected && (
          <div className="text-blue-600 text-sm font-medium text-center bg-blue-50 py-1 rounded">
            ✓ 選択中
          </div>
        )}
      </div>
    </div>
  );
}