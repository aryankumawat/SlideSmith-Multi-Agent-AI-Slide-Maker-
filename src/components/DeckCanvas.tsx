'use client';

import React, { useState, useCallback } from 'react';
import { Deck, Slide, Theme } from '@/lib/schema';
import { SlideView } from './SlideView';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface DeckCanvasProps {
  deck: Deck;
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onSlideUpdate: (slide: Slide) => void;
  onRegenerateSlide: (slideIndex: number) => void;
  onAddSlide: (afterIndex: number) => void;
  onDeleteSlide: (slideIndex: number) => void;
  className?: string;
}

export function DeckCanvas({
  deck,
  currentSlideIndex,
  onSlideChange,
  onSlideUpdate,
  onRegenerateSlide,
  onAddSlide,
  onDeleteSlide,
  className = '',
}: DeckCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [zoom, setZoom] = useState(1);

  const currentSlide = deck.slides[currentSlideIndex];

  const handlePreviousSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, onSlideChange]);

  const handleNextSlide = useCallback(() => {
    if (currentSlideIndex < deck.slides.length - 1) {
      onSlideChange(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, deck.slides.length, onSlideChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handlePreviousSlide();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleNextSlide();
        break;
      case 'Escape':
        event.preventDefault();
        setIsEditing(false);
        break;
      case 'e':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setIsEditing(!isEditing);
        }
        break;
    }
  }, [handlePreviousSlide, handleNextSlide, isEditing]);

  const handleBlockEdit = useCallback((blockIndex: number, block: any) => {
    if (!currentSlide) return;
    
    const updatedBlocks = [...currentSlide.blocks];
    updatedBlocks[blockIndex] = block;
    
    onSlideUpdate({
      ...currentSlide,
      blocks: updatedBlocks,
    });
  }, [currentSlide, onSlideUpdate]);

  const handleBlockDelete = useCallback((blockIndex: number) => {
    if (!currentSlide) return;
    
    const updatedBlocks = currentSlide.blocks.filter((_, index) => index !== blockIndex);
    
    onSlideUpdate({
      ...currentSlide,
      blocks: updatedBlocks,
    });
  }, [currentSlide, onSlideUpdate]);

  const handleBlockAdd = useCallback((blockIndex: number, block: any) => {
    if (!currentSlide) return;
    
    const updatedBlocks = [...currentSlide.blocks];
    updatedBlocks.splice(blockIndex + 1, 0, block);
    
    onSlideUpdate({
      ...currentSlide,
      blocks: updatedBlocks,
    });
  }, [currentSlide, onSlideUpdate]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium">
            {currentSlideIndex + 1} of {deck.slides.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextSlide}
            disabled={currentSlideIndex === deck.slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Exit Edit' : 'Edit'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerateSlide(currentSlideIndex)}
          >
            Regenerate
          </Button>
        </div>
      </div>

      {/* Slide Container */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className="transform transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
          }}
        >
          {currentSlide && (
            <SlideView
              slide={currentSlide}
              theme={deck.theme || 'DeepSpace'}
              isEditing={isEditing}
              onBlockEdit={handleBlockEdit}
              onBlockDelete={handleBlockDelete}
              onBlockAdd={handleBlockAdd}
            />
          )}
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="border-t bg-white dark:bg-gray-900 p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {deck.slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => onSlideChange(index)}
              className={`flex-shrink-0 w-20 h-12 rounded border-2 transition-colors ${
                index === currentSlideIndex
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-xs">
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

