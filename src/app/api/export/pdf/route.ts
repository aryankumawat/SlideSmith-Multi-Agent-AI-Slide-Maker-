import { NextRequest, NextResponse } from 'next/server';
import { Deck } from '@/lib/schema';
import PDFDocument from 'pdfkit';

export async function POST(request: NextRequest) {
  try {
    const { deck } = await request.json();
    
    if (!deck) {
      return NextResponse.json(
        { error: 'Deck data is required' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generatePDF(deck);
    
    const filename = (deck.title || deck.meta?.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_');
    
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

async function generatePDF(deck: Deck): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document (landscape for presentation)
      const doc = new PDFDocument({
        size: [792, 612], // Landscape (11" x 8.5")
        margins: { top: 50, bottom: 50, left: 60, right: 60 }
      });
      
      const chunks: Buffer[] = [];
      
      // Collect PDF chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Get theme colors
      const theme = getThemeForPDF(deck.theme || 'deep_space');
      
      // Add each slide as a page
      deck.slides.forEach((slide: any, index: number) => {
        if (index > 0) {
          doc.addPage();
        }
        
        // Set background
        doc.rect(0, 0, 792, 612).fill(theme.background);
        
        // Add slide number
        doc.fontSize(10).fillColor(theme.textSecondary)
           .text(`${index + 1} / ${deck.slides.length}`, 720, 570);
        
        // Add slide title
        if (slide.blocks) {
          const heading = slide.blocks.find((b: any) => b.type === 'Heading');
          if (heading && heading.text) {
            doc.fontSize(32).fillColor(theme.primary)
               .text(heading.text, 60, 60, { width: 672, align: 'left' });
          }
          
          // Add bullets
          const bullets = slide.blocks.find((b: any) => b.type === 'Bullets');
          if (bullets && bullets.items) {
            let yPos = 140;
            doc.fontSize(18).fillColor(theme.text);
            
            bullets.items.slice(0, 5).forEach((bullet: string) => {
              // Truncate long bullets
              const truncated = bullet.length > 80 ? bullet.substring(0, 77) + '...' : bullet;
              doc.text(`• ${truncated}`, 80, yPos, { width: 632, lineGap: 8 });
              yPos += 60;
            });
          }
        } else if (slide.title) {
          // Handle new format (title + bullets)
          doc.fontSize(32).fillColor(theme.primary)
             .text(slide.title, 60, 60, { width: 672, align: 'left' });
          
            if (slide.bullets && Array.isArray(slide.bullets)) {
                let yPos = 140;
                doc.fontSize(18).fillColor(theme.text);
                
                // NO truncation - use proper text wrapping instead
                const maxBullets = Math.min(slide.bullets.length, 8);
                const bulletSpacing = (612 - 140 - 70) / maxBullets; // Dynamic spacing
                
                slide.bullets.slice(0, maxBullets).forEach((bullet: string, idx: number) => {
                  // Use PDFKit's built-in text wrapping (no manual truncation!)
                  doc.text(`• ${bullet}`, 80, yPos, { 
                    width: 632,
                    lineGap: 6,
                    ellipsis: false, // Don't add "..." 
                  });
                  yPos += Math.min(bulletSpacing, 65); // Adaptive spacing
                });
              }
        }
        
        // Add footer
        const title = deck.title || '';
        if (title) {
          doc.fontSize(10).fillColor(theme.textSecondary)
             .text(title, 60, 570, { width: 600, align: 'left' });
        }
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getThemeForPDF(theme: string) {
  const normalizedTheme = theme.toLowerCase().replace(/[_-]/g, '');
  
  const themes: Record<string, any> = {
    deepspace: {
      background: '#0a0a0f',
      text: '#ffffff',
      textSecondary: '#a1a1aa',
      primary: '#6366f1',
    },
    ultraviolet: {
      background: '#1a0b2e',
      text: '#ffffff',
      textSecondary: '#c4b5fd',
      primary: '#8b5cf6',
    },
    minimal: {
      background: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      primary: '#000000',
    },
    corporate: {
      background: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      primary: '#1e40af',
    },
  };
  
  return themes[normalizedTheme] || themes.deepspace;
}
