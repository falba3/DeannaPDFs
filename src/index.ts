import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import { generateCatalogPdf } from './lib';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: npx ts-node src/index.ts <book_id> [output_path]');
    process.exit(1);
  }
  
  const bookId = parseInt(args[0], 10);
  const outputPath = args[1];
  
  const { buffer, filename, ministore, imageCount } = await generateCatalogPdf(bookId);
  
  const finalPath = outputPath || filename;
  fs.writeFileSync(finalPath, buffer);
  
  console.log(`Found ${imageCount} images for ministore: ${ministore.name}`);
  console.log(`PDF generated: ${finalPath}`);
}

main().catch(console.error);
