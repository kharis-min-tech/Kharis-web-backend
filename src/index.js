import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { app, docsRouter } from './app.js';
import { config } from './config.js';
import { specs } from './config/swagger.js';

// The docs read source files and serve swagger-ui from node_modules, which a
// Worker doesn't have, so they are only mounted when running under Node.
docsRouter.use(swaggerUi.serve, swaggerUi.setup(specs));

app.listen(config.port, () => console.log(`Kharis web backend listening on port ${config.port}`));
