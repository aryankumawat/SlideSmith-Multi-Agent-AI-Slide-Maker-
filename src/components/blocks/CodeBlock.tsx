'use client';

import React from 'react';
import { SlideBlock, Theme } from '@/lib/schema';
import { getThemeConfig } from '@/lib/theming';
import { BaseBlock } from './BaseBlock';

interface CodeBlockProps {
  block: SlideBlock;
  theme: Theme;
  isEditing?: boolean;
  onEdit?: (block: SlideBlock) => void;
  onDelete?: () => void;
  onAdd?: (block: SlideBlock) => void;
}

export function CodeBlock({
  block,
  theme,
  isEditing = false,
  onEdit,
  onDelete,
  onAdd,
}: CodeBlockProps) {
  const themeConfig = getThemeConfig(theme);

  if (block.type !== 'Code') {
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
      <div className="space-y-2">
        {block.language && (
          <div
            className="text-sm font-medium px-3 py-1 rounded-t-lg inline-block"
            style={{
              backgroundColor: themeConfig.colors.surface,
              color: themeConfig.colors.textSecondary,
            }}
          >
            {block.language}
          </div>
        )}
        
        <pre
          className="overflow-x-auto rounded-lg p-4 text-sm"
          style={{
            backgroundColor: themeConfig.colors.surface,
            color: themeConfig.colors.text,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          }}
        >
          <code>{block.code}</code>
        </pre>
      </div>
    </BaseBlock>
  );
}

