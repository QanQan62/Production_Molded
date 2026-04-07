import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_SHARED_URL || 'file:./dummy_shared.db',
  authToken: process.env.TURSO_SHARED_TOKEN || '',
});

export const dbShared = drizzle(client);
