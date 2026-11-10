export const CASES = [
  ['namaskAra', 'Normal', 'Devanagari'],
  ['rAmaH', 'Normal', 'Telugu'],
  ['कृष्णः', 'Devanagari', 'Normal'],
  ['𑀕𑀗𑁆𑀕𑀸', 'Brahmi', 'Tamil']
];

/** Compares `transliterate_wasm` with the JS `transliterate` (which does not load WASM). */
export async function compare(transliterate, transliterate_wasm) {
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
  return results;
}

export const handle = (check) => ({
  async fetch(request) {
    if (new URL(request.url).pathname === '/ping') return new Response('ok');
    return Response.json(await check());
  }
});
