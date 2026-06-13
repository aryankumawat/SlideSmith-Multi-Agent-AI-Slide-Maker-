import { Deck, Slide, SlideBlock } from './schema';

export interface VerificationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: VerificationIssue[];
  suggestions: string[];
}

export interface VerificationIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high';
  slideId?: string;
  blockId?: string;
  message: string;
  suggestion?: string;
}

export class ContentVerifier {
  private static instance: ContentVerifier;
  
  public static getInstance(): ContentVerifier {
    if (!ContentVerifier.instance) {
      ContentVerifier.instance = new ContentVerifier();
    }
    return ContentVerifier.instance;
  }

  async verifyDeck(deck: Deck): Promise<VerificationResult> {
    const issues: VerificationIssue[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Verify deck metadata
    const metadataIssues = this.verifyMetadata({ title: deck.title, author: deck.metadata?.author });
    issues.push(...metadataIssues);

    // Verify slides
    if (!deck.slides || deck.slides.length === 0) {
      issues.push({
        type: 'error',
        severity: 'high',
        message: 'No slides found in the deck',
        suggestion: 'Add at least one slide to the presentation'
      });
      return { isValid: false, score: 0, issues, suggestions: [] };
    }

    // Verify each slide
    for (const slide of deck.slides) {
      const slideResult = this.verifySlide(slide);
      issues.push(...slideResult.issues);
      totalScore += slideResult.score;
      maxScore += 100;
    }

    // Check overall structure
    const structureIssues = this.verifyStructure(deck.slides);
    issues.push(...structureIssues);

    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isValid = finalScore >= 70 && !issues.some(issue => issue.type === 'error');

    return {
      isValid,
      score: finalScore,
      issues,
      suggestions: this.generateSuggestions(issues)
    };
  }

  private verifyMetadata(meta: { title: string; author?: string }): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    if (!meta.title || meta.title.trim().length === 0) {
      issues.push({
        type: 'error',
        severity: 'high',
        message: 'Presentation title is missing',
        suggestion: 'Add a clear, descriptive title for your presentation'
      });
    } else if (meta.title.length > 100) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Presentation title is too long',
        suggestion: 'Keep the title under 100 characters for better readability'
      });
    }

    if (!meta.author || meta.author.trim().length === 0) {
      issues.push({
        type: 'warning',
        severity: 'low',
        message: 'Author information is missing',
        suggestion: 'Add author information for proper attribution'
      });
    }

    return issues;
  }

  private verifySlide(slide: Slide): { issues: VerificationIssue[]; score: number } {
    const issues: VerificationIssue[] = [];
    let score = 100;

    // Check if slide has content
    if (!slide.blocks || slide.blocks.length === 0) {
      issues.push({
        type: 'error',
        severity: 'high',
        slideId: slide.id,
        message: 'Slide has no content blocks',
        suggestion: 'Add at least one content block to this slide'
      });
      return { issues, score: 0 };
    }

    // Check for title/heading
    const hasHeading = slide.blocks.some(block => block.type === 'Heading');
    if (!hasHeading) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        slideId: slide.id,
        message: 'Slide missing a heading',
        suggestion: 'Add a heading to clearly identify the slide topic'
      });
      score -= 20;
    }

    // Check content quality
    const contentBlocks = slide.blocks.filter(block => 
      ['Markdown', 'Bullets', 'Quote', 'Code'].includes(block.type)
    );

    if (contentBlocks.length === 0) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        slideId: slide.id,
        message: 'Slide has no main content',
        suggestion: 'Add content blocks like text, bullets, or quotes to provide information'
      });
      score -= 30;
    }

    // Check for overly long content
    for (const block of slide.blocks) {
      const blockIssues = this.verifyBlock(block, slide.id);
      issues.push(...blockIssues);
      
      if (blockIssues.some(issue => issue.type === 'error')) {
        score -= 20;
      } else if (blockIssues.some(issue => issue.type === 'warning')) {
        score -= 10;
      }
    }

    // Check slide length
    const totalContent = slide.blocks
      .map(block => this.getBlockText(block))
      .join(' ')
      .length;

    if (totalContent > 1000) {
      issues.push({
        type: 'warning',
        severity: 'low',
        slideId: slide.id,
        message: 'Slide content is quite long',
        suggestion: 'Consider splitting this slide into multiple slides for better readability'
      });
      score -= 5;
    }

    return { issues, score: Math.max(0, score) };
  }

  private verifyBlock(block: SlideBlock, slideId: string): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    switch (block.type) {
      case 'Heading':
        if (!block.text || block.text.trim().length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Heading block is empty',
            suggestion: 'Add text to the heading block'
          });
        } else if (block.text.length > 80) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            slideId,
            message: 'Heading is too long',
            suggestion: 'Keep headings under 80 characters for better readability'
          });
        }
        break;

      case 'Subheading':
        if (!block.text || block.text.trim().length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Subheading block is empty',
            suggestion: 'Add text to the subheading block'
          });
        }
        break;

      case 'Markdown':
        if (!block.md || block.md.trim().length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Markdown block is empty',
            suggestion: 'Add content to the markdown block'
          });
        }
        break;

      case 'Bullets':
        if (!block.items || block.items.length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Bullet list is empty',
            suggestion: 'Add items to the bullet list'
          });
        } else if (block.items.length > 8) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            slideId,
            message: 'Too many bullet points',
            suggestion: 'Limit bullet points to 8 or fewer for better readability'
          });
        } else {
          // Check individual bullet points
          for (let i = 0; i < block.items.length; i++) {
            const item = block.items[i];
            if (!item || item.trim().length === 0) {
              issues.push({
                type: 'warning',
                severity: 'low',
                slideId,
                message: `Bullet point ${i + 1} is empty`,
                suggestion: 'Remove empty bullet points or add content'
              });
            } else if (item.length > 100) {
              issues.push({
                type: 'warning',
                severity: 'low',
                slideId,
                message: `Bullet point ${i + 1} is too long`,
                suggestion: 'Keep bullet points under 100 characters'
              });
            }
          }
        }
        break;

      case 'Quote':
        if (!block.text || block.text.trim().length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Quote block is empty',
            suggestion: 'Add text to the quote block'
          });
        } else if (block.text.length > 200) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            slideId,
            message: 'Quote is too long',
            suggestion: 'Keep quotes under 200 characters for better readability'
          });
        }
        break;

      case 'Code':
        if (!block.code || block.code.trim().length === 0) {
          issues.push({
            type: 'error',
            severity: 'high',
            slideId,
            message: 'Code block is empty',
            suggestion: 'Add code to the code block'
          });
        } else if (block.code.length > 500) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            slideId,
            message: 'Code block is too long',
            suggestion: 'Consider shortening the code or splitting it across multiple slides'
          });
        }
        break;
    }

    return issues;
  }

  private verifyStructure(slides: Slide[]): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    // Check for title slide
    const firstSlide = slides[0];
    if (!firstSlide || !this.hasTitleSlide(firstSlide)) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Missing title slide',
        suggestion: 'Add a title slide at the beginning of your presentation'
      });
    }

    // Check for conclusion slide
    const lastSlide = slides[slides.length - 1];
    if (!lastSlide || !this.hasConclusionSlide(lastSlide)) {
      issues.push({
        type: 'warning',
        severity: 'low',
        message: 'Missing conclusion slide',
        suggestion: 'Add a conclusion slide at the end of your presentation'
      });
    }

    // Check slide count
    if (slides.length < 3) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Very few slides in presentation',
        suggestion: 'Consider adding more content to make a complete presentation'
      });
    } else if (slides.length > 50) {
      issues.push({
        type: 'warning',
        severity: 'low',
        message: 'Many slides in presentation',
        suggestion: 'Consider if all slides are necessary or if some can be combined'
      });
    }

    return issues;
  }

  private hasTitleSlide(slide: Slide): boolean {
    const headingBlock = slide.blocks.find(block => block.type === 'Heading');
    return headingBlock !== undefined && slide.blocks.length <= 3;
  }

  private hasConclusionSlide(slide: Slide): boolean {
    const headingBlock = slide.blocks.find(block => block.type === 'Heading');
    if (!headingBlock) return false;
    
    const conclusionKeywords = ['conclusion', 'summary', 'wrap-up', 'thank you', 'questions'];
    return conclusionKeywords.some(keyword => 
      headingBlock.text.toLowerCase().includes(keyword)
    );
  }

  private getBlockText(block: SlideBlock): string {
    switch (block.type) {
      case 'Heading':
      case 'Subheading':
      case 'Quote':
        return block.text || '';
      case 'Markdown':
        return block.md || '';
      case 'Bullets':
        return block.items.join(' ');
      case 'Code':
        return block.code || '';
      default:
        return '';
    }
  }

  private generateSuggestions(issues: VerificationIssue[]): string[] {
    const suggestions: string[] = [];
    const errorCount = issues.filter(issue => issue.type === 'error').length;
    const warningCount = issues.filter(issue => issue.type === 'warning').length;

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} error${errorCount > 1 ? 's' : ''} to improve presentation quality`);
    }

    if (warningCount > 0) {
      suggestions.push(`Address ${warningCount} warning${warningCount > 1 ? 's' : ''} for better presentation flow`);
    }

    if (issues.length === 0) {
      suggestions.push('Your presentation looks great! Consider adding speaker notes for better delivery.');
    }

    return suggestions;
  }
}
