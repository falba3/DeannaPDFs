import { NextRequest, NextResponse } from 'next/server';
import { MySQLConnector } from '@/lib/db';

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  numClips: number;
  created: Date;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const connector = new MySQLConnector();
  
  try {
    await connector.connect();
    
    // Check if query is a number (ID search)
    const isIdSearch = /^\d+$/.test(query);
    
    let results: SearchResult[];
    
    if (isIdSearch) {
      results = await connector.executeQuery<SearchResult>(
        `SELECT id, name, slug, numClips, created
         FROM cliperest_book 
         WHERE id = ? OR id LIKE ?
         ORDER BY numClips DESC
         LIMIT 10`,
        [parseInt(query), `${query}%`]
      );
    } else {
      // Fuzzy search on name and slug
      const searchTerm = `%${query}%`;
      results = await connector.executeQuery<SearchResult>(
        `SELECT id, name, slug, numClips, created
         FROM cliperest_book 
         WHERE name LIKE ? OR slug LIKE ?
         ORDER BY 
           CASE 
             WHEN name LIKE ? THEN 1
             WHEN slug LIKE ? THEN 2
             ELSE 3
           END,
           numClips DESC
         LIMIT 10`,
        [searchTerm, searchTerm, `${query}%`, `${query}%`]
      );
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  } finally {
    await connector.disconnect();
  }
}
