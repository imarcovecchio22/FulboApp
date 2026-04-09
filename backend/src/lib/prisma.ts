import { PrismaClient } from '@prisma/client';
// Schema is at ./prisma/schema.prisma (root of backend)
import logger from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

export default prisma;
