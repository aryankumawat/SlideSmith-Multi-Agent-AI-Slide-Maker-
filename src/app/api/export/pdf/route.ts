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
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: `Failed to generate PDF: ${msg}` },
      { status: 500 }
    );
  }
}

function stripMdForPDF(text: string): string {
  return text
    .replace(/^>\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

async function generatePDF(deck: Deck): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [792, 612],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const theme = getThemeForPDF(deck.theme || 'deep_space');

      deck.slides.forEach((slide: any, index: number) => {
        doc.addPage({ size: [792, 612], margins: { top: 0, bottom: 0, left: 0, right: 0 } });

        // Background
        doc.rect(0, 0, 792, 612).fill(theme.background);

        let yPos = 55;

        // Title heading at top
        const titleText: string = (() => {
          if (slide.blocks) {
            const h = slide.blocks.find((b: any) => b.type === 'Heading');
            return h?.text || '';
          }
          return slide.title || '';
        })();

        if (titleText) {
          doc.fontSize(28).fillColor(theme.primary)
             .text(titleText, 55, yPos, { width: 682, align: 'left' });
          yPos += 48;
        }

        // Accent line under title
        doc.rect(55, yPos, 682, 2).fill(theme.primary);
        yPos += 10;

        if (slide.blocks) {
          // Subheading
          const sub = slide.blocks.find((b: any) => b.type === 'Subheading');
          if (sub?.text) {
            doc.fontSize(14).fillColor(theme.textSecondary)
               .text(sub.text, 55, yPos, { width: 682 });
            yPos += 28;
          }

          // Markdown blocks (description + key figure)
          const mdBlocks = slide.blocks.filter((b: any) => b.type === 'Markdown');
          for (const md of mdBlocks) {
            if (md.md && yPos < 520) {
              const clean = stripMdForPDF(md.md);
              if (clean) {
                doc.fontSize(12).fillColor(theme.textSecondary)
                   .text(clean, 55, yPos, { width: 682, lineGap: 3 });
                yPos += 36;
              }
            }
          }

          // Bullets
          const bulletsBlock = slide.blocks.find((b: any) => b.type === 'Bullets');
          if (bulletsBlock?.items) {
            doc.fontSize(15).fillColor(theme.text);
            bulletsBlock.items.slice(0, 6).forEach((bullet: string) => {
              if (yPos < 545) {
                const truncated = bullet.length > 85 ? bullet.substring(0, 82) + '...' : bullet;
                doc.text(`•  ${truncated}`, 65, yPos, { width: 672, lineGap: 4 });
                yPos += 44;
              }
            });
          }
        } else if (slide.title) {
          // Flat format (title + bullets)
          if (slide.bullets?.length) {
            const maxB = Math.min(slide.bullets.length, 7);
            doc.fontSize(15).fillColor(theme.text);
            slide.bullets.slice(0, maxB).forEach((bullet: string) => {
              if (yPos < 545) {
                doc.text(`•  ${bullet}`, 65, yPos, { width: 672, lineGap: 4 });
                yPos += 44;
              }
            });
          }
        }

        // Footer: title left, slide number right
        doc.fontSize(9).fillColor(theme.textSecondary)
           .text(deck.title || '', 55, 585, { width: 500, align: 'left' });
        doc.fontSize(9).fillColor(theme.textSecondary)
           .text(`${index + 1} / ${deck.slides.length}`, 672, 585, { width: 70, align: 'right' });
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
