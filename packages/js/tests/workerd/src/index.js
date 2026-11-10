// Runs in the Cloudflare Workers runtime (workerd) with `lipilekhika` installed from the packed
// tarball, so `lipilekhika/wasm` resolves through the `workerd` export condition as for a user.
import { transliterate_wasm, preloadWasm } from 'lipilekhika/wasm';
import { transliterate, transliterate_wasm as root_transliterate_wasm } from 'lipilekhika';

const CASES = [
  ['namaskAra', 'Normal', 'Devanagari'],
  ['rAmaH', 'Normal', 'Telugu'],
  ['कृष्णः', 'Devanagari', 'Normal'],
  ['𑀕𑀗𑁆𑀕𑀸', 'Brahmi', 'Tamil']
];

export default {
  async fetch() {
    await preloadWasm();
    const results = [];
    for (const [text, from, to] of CASES) {
      results.push({
        label: `${from} -> ${to}`,
        js: await transliterate(text, from, to),
        wasm: await transliterate_wasm(text, from, to)
      });
    }
    const texts = CASES.filter((c) => c[1] === 'Normal').map((c) => c[0]);
    results.push({
      label: 'many',
      js: (await transliterate(texts, 'Normal', 'Devanagari')).join('|'),
      wasm: (await transliterate_wasm(texts, 'Normal', 'Devanagari')).join('|')
    });

    // the root `transliterate_wasm` (embedded base64 module) works on Workers too (it failed with
    // `Invalid URL` when its `data:` URL was resolved against the missing `import.meta.url`)
    for (const [text, from, to] of CASES) {
      results.push({
        label: `root ${from} -> ${to}`,
        js: await transliterate(text, from, to),
        wasm: await root_transliterate_wasm(text, from, to)
      });
    }
    return Response.json({ results });
  }
};
