import { PrismaClient } from '@/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL_POOLED!,
});

export const prisma = new PrismaClient({ adapter });
