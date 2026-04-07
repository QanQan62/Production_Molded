import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.TURSO_DATABASE_URL) {
  console.error('TURSO_DATABASE_URL not found');
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL.replace('/v2/pipeline', ''),
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function seed() {
  const data = [
    { moldType: 'OV-0302', targetPerHour: 150 },
    { moldType: 'OE-0198', targetPerHour: 210 },
    { moldType: 'OE-0931', targetPerHour: 210 },
    { moldType: 'OE-1057', targetPerHour: 210 },
    { moldType: 'OE-1338', targetPerHour: 210 },
    { moldType: 'OV-0031', targetPerHour: 210 },
    { moldType: 'OV-0167M', targetPerHour: 210 },
    { moldType: 'OV-0167W', targetPerHour: 210 },
    { moldType: 'OV-0237', targetPerHour: 210 },
    { moldType: 'OV-0337', targetPerHour: 210 },
    { moldType: 'OV-0363', targetPerHour: 210 },
    { moldType: 'OE-1237', targetPerHour: 210 },
    { moldType: 'OE-0656', targetPerHour: 290 },
    { moldType: 'OE-1128', targetPerHour: 290 },
    { moldType: 'OE-1429', targetPerHour: 290 },
    { moldType: 'OV-0229', targetPerHour: 290 },
    { moldType: 'OV-0277', targetPerHour: 290 },
    { moldType: 'OV-0338', targetPerHour: 290 },
    { moldType: 'OV-0341', targetPerHour: 290 },
    { moldType: 'OV-0356', targetPerHour: 290 },
    { moldType: 'OV-0361', targetPerHour: 290 },
    { moldType: 'OV-0397', targetPerHour: 290 },
    { moldType: 'OV-0423', targetPerHour: 290 },
    { moldType: 'OV-0428', targetPerHour: 290 },
    { moldType: 'OV-0435', targetPerHour: 290 },
    { moldType: 'OV-0436', targetPerHour: 290 },
    { moldType: 'OV-0459', targetPerHour: 290 },
    { moldType: 'OV-0291', targetPerHour: 290 },
    { moldType: 'OV-0378', targetPerHour: 290 },
    { moldType: 'OV-0208', targetPerHour: 290 },
    { moldType: 'OV-0370', targetPerHour: 290 },
    { moldType: 'OV-0318', targetPerHour: 290 },
    { moldType: 'OV-0267', targetPerHour: 330 },
    { moldType: 'OV-0274', targetPerHour: 330 },
    { moldType: 'OI-0019A', targetPerHour: 330 },
    { moldType: 'OS-0312', targetPerHour: 330 },
    { moldType: 'OSC-0003', targetPerHour: 330 },
    { moldType: 'OV-0235', targetPerHour: 330 },
    { moldType: 'OV-0256', targetPerHour: 330 },
    { moldType: 'OV-0270', targetPerHour: 330 },
    { moldType: 'OV-0278', targetPerHour: 330 },
    { moldType: 'OV-0286', targetPerHour: 330 },
    { moldType: 'OV-0288', targetPerHour: 330 },
    { moldType: 'OV-0292', targetPerHour: 330 },
    { moldType: 'OV-0297', targetPerHour: 330 },
    { moldType: 'OV-0312', targetPerHour: 330 },
    { moldType: 'OV-0331', targetPerHour: 330 },
    { moldType: 'OV-0333', targetPerHour: 330 },
    { moldType: 'OV-0339', targetPerHour: 330 },
    { moldType: 'OV-0358', targetPerHour: 330 },
    { moldType: 'OV-0377', targetPerHour: 330 },
    { moldType: 'OV-0389', targetPerHour: 330 },
    { moldType: 'OV-0220W', targetPerHour: 330 },
    { moldType: 'OV-0220M', targetPerHour: 330 },
    { moldType: 'OE-0373', targetPerHour: 330 },
    { moldType: 'OV-0345', targetPerHour: 400 },
    { moldType: 'OV-0402', targetPerHour: 400 },
    { moldType: 'OE-0002', targetPerHour: 330 },
    { moldType: 'OS-0111', targetPerHour: 330 },
    { moldType: 'OI-0023', targetPerHour: 330 },
    { moldType: 'OE-0199', targetPerHour: 290 },
    { moldType: 'OV-0422', targetPerHour: 330 },
    { moldType: 'OE-0555', targetPerHour: 330 },
    { moldType: 'OV-0360', targetPerHour: 330 },
    { moldType: 'OV-0373', targetPerHour: 330 },
    { moldType: 'OV-0385', targetPerHour: 330 },
    { moldType: 'OV-0394', targetPerHour: 290 },
    { moldType: 'OV-0398', targetPerHour: 330 },
    { moldType: 'OV-0408', targetPerHour: 330 },
    { moldType: 'OV-0419', targetPerHour: 330 },
    { moldType: 'OV-0420', targetPerHour: 330 },
    { moldType: 'OV-0446', targetPerHour: 330 }
  ];

  try {
    const valuesStr = data.map(d => `('${d.moldType}', ${d.targetPerHour})`).join(', ');
    await client.execute(`INSERT OR REPLACE INTO mold_targets (mold_type, target_per_hour) VALUES ${valuesStr}`);
    console.log('Mold targets seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding mold targets:', err);
    process.exit(1);
  }
}

seed();
