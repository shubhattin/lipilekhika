import { transliterate } from './bind';

async function test() {
  console.log('Testing WASM binding...');
  const result = await transliterate('namaste', 'Normal', 'Devanagari');
  console.log(`namaste -> ${result}`);
  console.log('✅ Test passed!');
}

test().catch(console.error);
