# DeannaPDFs

Generate printable PDF catalogs from ministore image URLs.

## Setup

```bash
npm install
npx playwright install chromium
```

Create a `.env.local` file with database credentials:
```
DB_HOST=your_host
DB_USERNAME=your_user
DB_PASSWORD=your_password
DB_DATABASE=your_database
```

## CLI Usage

```bash
npm run explore                    # Explore database structure
npm run dev -- <book_id>           # Generate catalog PDF
npm run dev -- <book_id> out.pdf   # Custom output path
```

## Next.js Integration

```typescript
// app/api/catalog/[bookId]/route.ts
import { generateCatalogPdf } from 'deanna-pdfs';

export async function GET(
  request: Request,
  { params }: { params: { bookId: string } }
) {
  const { buffer, filename } = await generateCatalogPdf(parseInt(params.bookId));
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

## Exported Functions

```typescript
import { 
  generateCatalogPdf,    // Generate PDF buffer for a ministore
  listMinistores,        // List available ministores
  getMinistoreInfo,      // Get ministore details
  getMinistoreImages,    // Get images for a ministore
  generateCatalogHtml,   // Generate HTML (for preview)
  htmlToPdfBuffer,       // Convert HTML to PDF buffer
  MySQLConnector         // Database connector class
} from 'deanna-pdfs';
```

## How it works

1. Fetches image URLs from `cliperest_clipping` for a given ministore
2. Generates HTML with a magazine-style layout
3. Converts to PDF using Playwright (images fetched by URL, never stored locally)
