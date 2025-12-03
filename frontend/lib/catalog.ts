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

export function generateCatalogHtml(images: Clipping[], options: CatalogOptions = {}): string {
  const title = options.title || 'Product Catalog';
  const description = options.description || '';
  const layout = options.layout || 'portrait';
  const photosPerPage = options.photosPerPage || 4;
  const showCover = options.showCover !== false;
  const coverTitle = options.coverTitle || title;
  const coverSubtitle = options.coverSubtitle || description;

  const isLandscape = layout === 'landscape';
  const pageSize = isLandscape ? 'A4 landscape' : 'A4';
  
  let gridCols: number;
  let gridRows: number;
  
  if (photosPerPage === 1) {
    gridCols = 1; gridRows = 1;
  } else if (photosPerPage === 2) {
    gridCols = isLandscape ? 2 : 1; gridRows = isLandscape ? 1 : 2;
  } else if (photosPerPage <= 4) {
    gridCols = 2; gridRows = 2;
  } else if (photosPerPage <= 6) {
    gridCols = isLandscape ? 3 : 2; gridRows = isLandscape ? 2 : 3;
  } else if (photosPerPage <= 9) {
    gridCols = 3; gridRows = 3;
  } else {
    gridCols = 4; gridRows = 4;
  }

  const imageItems = images
    .map(img => {
      const imgUrl = img.thumbnail || img.url || '';
      const caption = img.caption || img.text || '';
      
      if (!imgUrl) return '';
      
      return `
        <div class="catalog-item">
          <div class="image-wrapper">
            <img src="${imgUrl}" alt="${caption}" onerror="this.style.display='none'" />
          </div>
          ${caption ? `<p class="caption">${caption}</p>` : ''}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const coverHtml = showCover ? `
  <div class="cover">
    <h1>${coverTitle}</h1>
    ${coverSubtitle ? `<p class="subtitle">${coverSubtitle}</p>` : ''}
    <p class="date">${monthYear}</p>
    <p class="item-count">${images.length} items</p>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: ${pageSize}; margin: 10mm; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      line-height: 1.4;
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
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }
    
    .cover .subtitle { font-size: 1.1rem; font-weight: 300; opacity: 0.9; max-width: 500px; }
    .cover .date { margin-top: 30px; font-size: 0.85rem; opacity: 0.7; }
    .cover .item-count { margin-top: 12px; padding: 6px 20px; background: rgba(255,255,255,0.2); border-radius: 16px; font-size: 0.8rem; }
    
    .catalog-container { padding: 10px 0; }
    
    .catalog-grid { 
      display: grid; 
      grid-template-columns: repeat(${gridCols}, 1fr); 
      grid-template-rows: repeat(${gridRows}, 1fr);
      gap: 15px; 
      padding: 10px;
      height: calc(100vh - 20mm);
      page-break-after: always;
    }
    
    .catalog-item { 
      break-inside: avoid; 
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
    }
    
    .image-wrapper {
      background: #f8f9fa;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
    
    .image-wrapper img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
    }
    
    .caption { 
      margin-top: 6px; 
      font-size: 0.75rem; 
      color: #555; 
      text-align: center;
      line-height: 1.2;
      max-height: 2.4em;
      overflow: hidden;
    }

    @media print {
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .catalog-item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${coverHtml}
  <div class="catalog-container">
    <div class="catalog-grid">${imageItems}</div>
  </div>
</body>
</html>`;
}

export async function htmlToPdfBuffer(html: string, layout: 'portrait' | 'landscape' = 'portrait'): Promise<Buffer> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
  
  await page.waitForFunction(() => {
    const images = document.querySelectorAll('img');
    return Array.from(images).every((img: HTMLImageElement) => img.complete);
  }, { timeout: 30000 }).catch(() => {
    console.log('Some images may not have loaded');
  });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: layout === 'landscape',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
  });
  
  await browser.close();
  return pdfBuffer;
}

export async function generateCatalogPdf(
  bookId: number, 
  options: CatalogOptions = {}
): Promise<{ buffer: Buffer; filename: string; ministore: Ministore; imageCount: number }> {
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
      description: ministore.description || '',
      ...options
    });
    
    const buffer = await htmlToPdfBuffer(html, options.layout);
    const safeName = ministore.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `catalog_${safeName}_${bookId}.pdf`;
    
    return { buffer, filename, ministore, imageCount: images.length };
  } finally {
    await connector.disconnect();
  }
}
