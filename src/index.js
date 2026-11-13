import 'dotenv/config';
import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => console.log(`Kharis web backend listening on port ${config.port}`));
