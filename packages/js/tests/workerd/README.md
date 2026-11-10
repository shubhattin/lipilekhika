Workers for `scripts/workerd_check.mjs` (`bun run test:workerd`). Each one uses a single entry of
the package: all entries share one wasm-bindgen instance, so a Worker using two would only ever
load the module the way of the first one called. `GET /ping` answers without touching WASM (used to
wait for `wrangler dev`), `GET /` runs the check and answers JSON `{ results, error? }`.
