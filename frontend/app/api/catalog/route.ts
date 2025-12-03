import { NextRequest, NextResponse } from 'next/server';
import { generateCatalogPdf } from '@/lib/catalog';
import { CatalogOptions } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, options } = body as { bookId: number; options?: CatalogOptions };
    
    if (!bookId || isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const catalogOptions: CatalogOptions = {
      layout: options?.layout || 'portrait',
      photosPerPage: options?.photosPerPage || 4,
      showCover: options?.showCover !== false,
      coverTitle: options?.coverTitle,
      coverSubtitle: options?.coverSubtitle,
    };

    const { buffer, filename } = await generateCatalogPdf(bookId, catalogOptions);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
