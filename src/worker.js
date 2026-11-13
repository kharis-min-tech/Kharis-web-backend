import { httpServerHandler } from 'cloudflare:node';
import { app } from './app.js';

// Cloudflare Workers entry. Vars and secrets reach process.env through nodejs_compat,
// so config.js reads them as it does under Node. /api-docs is only served by src/index.js.
app.listen(3000);

export default httpServerHandler({ port: 3000 });
