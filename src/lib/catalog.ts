import { chromium } from 'playwright';
import { MySQLConnector } from './db';
import { Ministore, Clipping, CatalogOptions } from './types';

export async function getMinistoreInfo(connector: MySQLConnector, bookId: number): Promise<Ministore | null> {
  const results = await connector.executeQuery<Ministore>(
    `SELECT id, name, description, coverImage, numClips, created
     FROM cliperest_book 
     WHERE id = ?`,
    [bookId]
  );
  return results[0] || null;
}

export async function getMinistoreImages(connector: MySQLConnector, bookId: number): Promise<Clipping[]> {
  return connector.executeQuery<Clipping>(
    `SELECT id, caption, text, thumbnail, url, created, num
     FROM cliperest_clipping 
     WHERE book_id = ? 
     ORDER BY num ASC`,
    [bookId]
  );
}

export async function listMinistores(connector: MySQLConnector, limit: number = 20): Promise<Ministore[]> {
  return connector.executeQuery<Ministore>(
    `SELECT id, name, description, numClips, created 
     FROM cliperest_book 
     WHERE numClips > 0
     ORDER BY id DESC 
     LIMIT ?`,
    [limit]
  );
}

export function generateCatalogHtml(images: Clipping[], options: CatalogOptions = {}): string {
  const title = options.title || 'Product Catalog';
  const description = options.description || '';
  
  const imageItems = images
    .map(img => {
      const imgUrl = img.thumbnail || img.url || '';
      const caption = img.caption || img.text || '';
      
      if (!imgUrl) return '';
      
      return `
        <div class="catalog-item">
          <div class="image-wrapper">
            <img src="${imgUrl}" alt="${caption}" loading="lazy" />
          </div>
          ${caption ? `<p class="caption">${caption}</p>` : ''}
        </div>
      `;
    })
    .join('');

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 15mm; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      line-height: 1.6;
    }
    
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      page-break-after: always;
      padding: 40px;
    }
    
    .cover h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      letter-spacing: -1px;
    }
    
    .cover .subtitle { font-size: 1.2rem; font-weight: 300; opacity: 0.9; max-width: 500px; }
    .cover .date { margin-top: 40px; font-size: 0.9rem; opacity: 0.7; }
    .cover .item-count { margin-top: 15px; padding: 8px 24px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 0.85rem; }
    
    .catalog-container { padding: 20px 0; }
    .catalog-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; padding: 20px; }
    .catalog-item { break-inside: avoid; page-break-inside: avoid; }
    
    .image-wrapper {
      background: #f8f9fa;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
    .caption { margin-top: 10px; font-size: 0.85rem; color: #555; text-align: center; }

    @media print {
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .catalog-item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${title}</h1>
    ${description ? `<p class="subtitle">${description}</p>` : ''}
    <p class="date">${monthYear}</p>
    <p class="item-count">${images.length} items</p>
  </div>
  <div class="catalog-container">
    <div class="catalog-grid">${imageItems}</div>
  </div>
</body>
</html>`;
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
  });
  
  await browser.close();
  return pdfBuffer;
}

export async function generateCatalogPdf(bookId: number): Promise<{ buffer: Buffer; filename: string; ministore: Ministore }> {
  const connector = new MySQLConnector();
  await connector.connect();
  
  try {
    const ministore = await getMinistoreInfo(connector, bookId);
    if (!ministore) {
      throw new Error(`Ministore with ID ${bookId} not found`);
    }
    
    const images = await getMinistoreImages(connector, bookId);
    if (images.length === 0) {
      throw new Error(`No images found for ministore ${bookId}`);
    }
    
    const html = generateCatalogHtml(images, {
      title: ministore.name || 'Product Catalog',
      description: ministore.description || ''
    });
    
    const buffer = await htmlToPdfBuffer(html);
    const safeName = ministore.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `catalog_${safeName}_${bookId}.pdf`;
    
    return { buffer, filename, ministore };
  } finally {
    await connector.disconnect();
  }
}
