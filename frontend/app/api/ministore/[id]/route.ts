import { NextRequest, NextResponse } from 'next/server';
import { MySQLConnector } from '@/lib/db';
import { Ministore, Clipping } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookId = parseInt(id, 10);
  
  if (isNaN(bookId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const connector = new MySQLConnector();
  
  try {
    await connector.connect();
    
    const ministores = await connector.executeQuery<Ministore>(
      `SELECT id, name, description, coverImage, numClips, created
       FROM cliperest_book 
       WHERE id = ?`,
      [bookId]
    );
    
    if (ministores.length === 0) {
      return NextResponse.json({ error: 'Ministore not found' }, { status: 404 });
    }
    
    const images = await connector.executeQuery<Clipping>(
      `SELECT id, caption, text, thumbnail, url, num
       FROM cliperest_clipping 
       WHERE book_id = ? 
       ORDER BY num ASC`,
      [bookId]
    );
    
    return NextResponse.json({
      ministore: ministores[0],
      imageCount: images.length,
      images: images.slice(0, 10)
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    await connector.disconnect();
  }
}
