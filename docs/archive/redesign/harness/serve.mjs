// Long-running static server for manual browsing of the prototypes.
// Usage: node serve.mjs [port]
import { startServer, PROTOTYPE_ROOT } from './lib/server.mjs';

const port = Number(process.argv[2]) || 4321;
const { url } = await startServer({ port });
console.log(`Serving ${PROTOTYPE_ROOT}`);
console.log(`  ${url}/Onboarding.html`);
console.log(`  ${url}/HomeTabs.html`);
console.log(`  ${url}/OneOff.html`);
console.log('Ctrl+C to stop.');
