import { config } from 'dotenv';
config({ path: '.env.local' });

import { MySQLConnector } from './lib';

async function main() {
  const connector = new MySQLConnector();
  await connector.connect();

  console.log('\n' + '='.repeat(60));
  console.log('DATABASE STRUCTURE');
  console.log('='.repeat(60));

  console.log('\ncliperest_book table:');
  console.log('-'.repeat(40));
  const bookColumns = await connector.executeQuery<{ Field: string; Type: string }>('DESCRIBE cliperest_book');
  bookColumns.forEach(row => console.log(`  ${row.Field.padEnd(25)} ${row.Type}`));

  console.log('\ncliperest_clipping table:');
  console.log('-'.repeat(40));
  const clippingColumns = await connector.executeQuery<{ Field: string; Type: string }>('DESCRIBE cliperest_clipping');
  clippingColumns.forEach(row => console.log(`  ${row.Field.padEnd(25)} ${row.Type}`));

  console.log('\nSample ministores (first 5):');
  console.log('-'.repeat(40));
  const ministores = await connector.executeQuery<{ id: number; name: string; numClips: number }>(
    'SELECT id, name, numClips FROM cliperest_book ORDER BY id DESC LIMIT 5'
  );
  ministores.forEach(row =>
    console.log(`  ID: ${String(row.id).padStart(6)} | Clips: ${String(row.numClips).padStart(4)} | ${row.name.slice(0, 50)}`)
  );

  console.log('\nGood test ministores (with 5+ images):');
  console.log('-'.repeat(40));
  const goodMinistores = await connector.executeQuery<{ id: number; name: string; numClips: number }>(
    'SELECT id, name, numClips FROM cliperest_book WHERE numClips >= 5 ORDER BY numClips DESC LIMIT 5'
  );
  goodMinistores.forEach(row =>
    console.log(`  ID: ${String(row.id).padStart(6)} | Clips: ${String(row.numClips).padStart(4)} | ${row.name.slice(0, 50)}`)
  );

  if (goodMinistores.length > 0) {
    console.log(`\nTry: npm run dev -- ${goodMinistores[0].id}`);
  }

  await connector.disconnect();
}

main().catch(console.error);
