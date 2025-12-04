import { NextRequest, NextResponse } from 'next/server';
import { MySQLConnector } from '@/lib/db';
import { generateCatalogHtml, getMinistoreInfo, getMinistoreImages } from '@/lib/catalog';
import { CatalogOptions } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, options } = body as { bookId: number; options?: CatalogOptions };
    
    if (!bookId || isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const connector = new MySQLConnector();
    await connector.connect();

    try {
      const ministore = await getMinistoreInfo(connector, bookId);
      if (!ministore) {
        return NextResponse.json({ error: 'Ministore not found' }, { status: 404 });
      }

      const images = await getMinistoreImages(connector, bookId);
      if (images.length === 0) {
        return NextResponse.json({ error: 'No images found' }, { status: 404 });
      }

      const catalogOptions: CatalogOptions = {
        title: ministore.name || 'Product Catalog',
        description: ministore.description || '',
        layout: options?.layout || 'portrait',
        photosPerPage: options?.photosPerPage || 4,
        showCover: options?.showCover !== false,
        coverTitle: options?.coverTitle || ministore.name,
        coverSubtitle: options?.coverSubtitle || ministore.description || '',
      };

      const html = generateCatalogHtml(images, catalogOptions);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } finally {
      await connector.disconnect();
    }
  } catch (error) {
    console.error('Preview error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
