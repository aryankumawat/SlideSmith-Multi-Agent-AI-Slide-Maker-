'use client';

import React from 'react';
import { SlideBlock, Theme } from '@/lib/schema';
import { getThemeConfig } from '@/lib/theming';
import { BaseBlock } from './BaseBlock';

interface ImageBlockProps {
  block: SlideBlock;
  theme: Theme;
  isEditing?: boolean;
  onEdit?: (block: SlideBlock) => void;
  onDelete?: () => void;
  onAdd?: (block: SlideBlock) => void;
}

export function ImageBlock({
  block,
  theme,
  isEditing = false,
  onEdit,
  onDelete,
  onAdd,
}: ImageBlockProps) {
  const themeConfig = getThemeConfig(theme);

  if (block.type !== 'Image') {
    return null;
  }

  return (
    <BaseBlock
      block={block}
      theme={theme}
      isEditing={isEditing}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      className="w-full"
    >
      <div className="space-y-4">
        <div className="relative">
          <img
            src={block.src}
            alt={block.alt || 'Slide image'}
            className="w-full h-auto rounded-lg shadow-lg"
            style={{
              maxHeight: '400px',
              objectFit: 'cover',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE3NSAxMjVIMjI1VjE3NUgxNzVWMTI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
            }}
          />
        </div>
        
        {(block.caption || block.alt) && (
          <p
            className="text-sm text-center italic"
            style={{ color: themeConfig.colors.textSecondary }}
          >
            {block.caption || block.alt}
          </p>
        )}
      </div>
    </BaseBlock>
  );
}

