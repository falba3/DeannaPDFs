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

  // Filter to only include items with actual image URLs
  const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    // Check for common image extensions or image hosting patterns
    return lower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) !== null ||
           lower.includes('/fotoweb/') ||
           lower.includes('/images/') ||
           lower.includes('/img/') ||
           lower.includes('cloudinary') ||
           lower.includes('imgur');
  };

  const imageItems = images
    .map(img => {
      // Prefer thumbnail, fall back to url only if it looks like an image
      let imgUrl = img.thumbnail || '';
      if (!imgUrl && img.url && isImageUrl(img.url)) {
        imgUrl = img.url;
      }
      const caption = img.caption || img.text || '';
      
      if (!imgUrl || !isImageUrl(imgUrl)) return '';
      
      return `
        <div class="catalog-item">
          <div class="image-wrapper">
            <img src="${imgUrl}" alt="${caption}" onerror="this.parentElement.parentElement.style.display='none'" />
          </div>
          ${caption ? `<p class="caption">${caption}</p>` : ''}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Count actual valid images
  const validImageCount = images.filter(img => {
    const imgUrl = img.thumbnail || '';
    return imgUrl && isImageUrl(imgUrl);
  }).length;

  const coverHtml = showCover ? `
  <div class="cover">
    <div class="cover-header">
      <span class="cover-label">CATALOG</span>
      <span class="cover-date">${monthYear}</span>
    </div>
    
    <div class="cover-main">
      <h1>${coverTitle}</h1>
      ${coverSubtitle ? `<p class="subtitle">${coverSubtitle}</p>` : ''}
      <div class="cover-divider"></div>
      <p class="item-count">${validImageCount} items</p>
    </div>
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
      background: #fafafa;
      color: #1a1a1a;
      page-break-after: always;
      padding: 0;
    }
    
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .cover-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: #666;
    }
    
    .cover-date {
      font-size: 0.75rem;
      color: #888;
    }
    
    .cover-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
    }
    
    .cover h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.4rem;
      font-weight: 400;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      color: #1a1a1a;
      max-width: 600px;
      line-height: 1.2;
    }
    
    .cover .subtitle { 
      font-size: 0.95rem; 
      font-weight: 400; 
      color: #666;
      max-width: 450px;
      line-height: 1.5;
    }
    
    .cover-divider {
      width: 40px;
      height: 2px;
      background: #1a1a1a;
      margin: 24px 0;
    }
    
    .cover .item-count { 
      font-size: 0.8rem;
      color: #888;
      font-weight: 500;
    }
    
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
