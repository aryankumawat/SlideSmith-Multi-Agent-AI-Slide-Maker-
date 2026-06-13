'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Slide, SlideBlock, Theme } from '@/lib/schema';
import { getThemeConfig } from '@/lib/theming';
import { HeadingBlock } from './blocks/HeadingBlock';
import { SubheadingBlock } from './blocks/SubheadingBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';
import { BulletsBlock } from './blocks/BulletsBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { ChartBlock } from './blocks/ChartBlock';
import { LiveBlock } from './blocks/LiveBlock';

interface SlideViewProps {
  slide: Slide;
  theme: Theme;
  isEditing?: boolean;
  onBlockEdit?: (blockIndex: number, block: SlideBlock) => void;
  onBlockDelete?: (blockIndex: number) => void;
  onBlockAdd?: (blockIndex: number, block: SlideBlock) => void;
  className?: string;
}

export function SlideView({
  slide,
  theme,
  isEditing = false,
  onBlockEdit,
  onBlockDelete,
  onBlockAdd,
  className = '',
}: SlideViewProps) {
  const themeConfig = getThemeConfig(theme);
  const [isVisible, setIsVisible] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const getSlideAnimationClasses = () => {
    if (!isVisible) {
      switch (slide.animation) {
        case 'fadeIn':
          return 'opacity-0';
        case 'slideInFromTop':
          return 'opacity-0 transform -translate-y-8';
        case 'slideInFromBottom':
          return 'opacity-0 transform translate-y-8';
        case 'hero':
          return 'opacity-0 transform scale-95';
        default:
          return 'opacity-0';
      }
    }

    const baseClasses = 'transition-all duration-1000 ease-out';
    switch (slide.animation) {
      case 'fadeIn':
        return `${baseClasses} opacity-100`;
      case 'slideInFromTop':
        return `${baseClasses} opacity-100 transform translate-y-0`;
      case 'slideInFromBottom':
        return `${baseClasses} opacity-100 transform translate-y-0`;
      case 'hero':
        return `${baseClasses} opacity-100 transform scale-100`;
      default:
        return `${baseClasses} opacity-100`;
    }
  };

  const renderBlock = (block: SlideBlock, index: number) => {
    const commonProps = {
      block,
      theme,
      isEditing,
      onEdit: (updatedBlock: SlideBlock) => onBlockEdit?.(index, updatedBlock),
      onDelete: () => onBlockDelete?.(index),
      onAdd: (newBlock: SlideBlock) => onBlockAdd?.(index, newBlock),
    };

    switch (block.type) {
      case 'Heading':
        return <HeadingBlock {...commonProps} />;
      case 'Subheading':
        return <SubheadingBlock {...commonProps} />;
      case 'Markdown':
        return <MarkdownBlock {...commonProps} />;
      case 'Bullets':
        return <BulletsBlock {...commonProps} />;
      case 'Image':
        return <ImageBlock {...commonProps} />;
      case 'Quote':
        return <QuoteBlock {...commonProps} />;
      case 'Code':
        return <CodeBlock {...commonProps} />;
      case 'Chart':
        return <ChartBlock {...commonProps} />;
      case 'Live':
        return <LiveBlock {...commonProps} />;
      default:
        return null;
    }
  };

  const getLayoutClasses = () => {
    switch (slide.layout) {
      case 'title':
        return 'flex flex-col items-center justify-center text-center space-y-8';
      case 'title+bullets':
        return 'flex flex-col space-y-6';
      case 'two-col':
        return 'grid grid-cols-1 md:grid-cols-2 gap-8';
      case 'media-left':
        return 'grid grid-cols-1 md:grid-cols-2 gap-8 items-center';
      case 'media-right':
        return 'grid grid-cols-1 md:grid-cols-2 gap-8 items-center';
      case 'quote':
        return 'flex flex-col items-center justify-center text-center space-y-6';
      case 'chart':
        return 'flex flex-col space-y-6';
      case 'end':
        return 'flex flex-col items-center justify-center text-center space-y-8';
      default:
        return 'flex flex-col space-y-6';
    }
  };

  return (
    <div
      ref={slideRef}
      className={`w-full h-full p-8 md:p-12 ${getSlideAnimationClasses()} ${className}`}
      style={{
        backgroundColor: themeConfig.colors.background,
        color: themeConfig.colors.text,
        fontFamily: themeConfig.typography.fontFamily,
        backgroundImage: (themeConfig as { backgroundImage?: string }).backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className={`max-w-6xl mx-auto h-full ${getLayoutClasses()}`}>
        {slide.blocks.map((block, index) => (
          <div
            key={index}
            className="w-full"
            style={{
              animationDelay: `${index * 200}ms`,
            }}
          >
            {renderBlock(block, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
