import swaggerJsdoc from 'swagger-jsdoc';

// API docs served at /api-docs. Each route documents itself with an
// @swagger comment in src/modules/**; this file only holds the shared parts.

const info = {
  title: 'Kharis Web API',
  version: '1.0.0',
  description: 'Backend for kharis.org, KP2 and the Content Studio.',
};

// /v1/studio routes take a Supabase Auth access token.
const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
};

// Tags group routes in the docs. They are listed in display order.
const tags = [
  // Websites (kharis.org and KP2)
  { name: 'Site', description: 'Public branches, events, testimonies and media for the websites' },
  { name: 'Forms', description: 'Contact, visit and quiz submissions from the websites' },

  // Content Studio
  { name: 'Studio', description: 'Content Studio accounts and roles (Supabase Auth tokens)' },
  {
    name: 'Studio data',
    description: 'Content Studio reads and writes, run as the signed-in editor so RLS applies',
  },
];

export const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info,
    components: { securitySchemes },
    tags,
  },
  apis: ['./src/modules/**/*.js'],
});
