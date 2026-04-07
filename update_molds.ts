import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!.replace('/v2/pipeline', ''),
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function updateMolds() {
  const data = [
    { moldType: 'OV-0302', target: 150 }, { moldType: 'OE-0198', target: 210 }, { moldType: 'OE-0931', target: 210 },
    { moldType: 'OE-1057', target: 210 }, { moldType: 'OE-1338', target: 210 }, { moldType: 'OV-0031', target: 210 },
    { moldType: 'OV-0167M', target: 210 }, { moldType: 'OV-0167W', target: 210 }, { moldType: 'OV-0237', target: 210 },
    { moldType: 'OV-0337', target: 210 }, { moldType: 'OV-0363', target: 210 }, { moldType: 'OE-1237', target: 210 },
    { moldType: 'OE-0656', target: 290 }, { moldType: 'OE-1128(TA-1ot)', target: 290 }, { moldType: 'OE-1429', target: 290 },
    { moldType: 'OV-0229', target: 290 }, { moldType: 'OV-0277', target: 290 }, { moldType: 'OV-0338', target: 290 },
    { moldType: 'OV-0341', target: 290 }, { moldType: 'OV-0356', target: 290 }, { moldType: 'OV-0361', target: 290 },
    { moldType: 'OV-0397', target: 290 }, { moldType: 'OV-0423', target: 290 }, { moldType: 'OV-0428', target: 290 },
    { moldType: 'OV-0435', target: 290 }, { moldType: 'OV-0436', target: 290 }, { moldType: 'OV-0459', target: 290 },
    { moldType: 'OV-0291', target: 290 }, { moldType: 'OV-0378', target: 290 }, { moldType: 'OV-0208', target: 290 },
    { moldType: 'OV-0370', target: 290 }, { moldType: 'OV-0318', target: 290 }, { moldType: 'OV-0267', target: 330 },
    { moldType: 'OV-0274', target: 330 }, { moldType: 'OI-0019A', target: 330 }, { moldType: 'OS-0312', target: 330 },
    { moldType: 'OSC-0003', target: 330 }, { moldType: 'OV-0235', target: 330 }, { moldType: 'OV-0256', target: 330 },
    { moldType: 'OV-0270', target: 330 }, { moldType: 'OV-0278', target: 330 }, { moldType: 'OV-0286', target: 330 },
    { moldType: 'OV-0286-1', target: 330 }, { moldType: 'OV-0288', target: 330 }, { moldType: 'OV-0291(MN-4ot-SP)', target: 330 },
    { moldType: 'OV-0292', target: 330 }, { moldType: 'OV-0292-1', target: 330 }, { moldType: 'OV-0297', target: 330 },
    { moldType: 'OV-0312', target: 330 }, { moldType: 'OV-0331', target: 330 }, { moldType: 'OV-0333', target: 330 },
    { moldType: 'OV-0339', target: 330 }, { moldType: 'OV-0358', target: 330 }, { moldType: 'OV-0377', target: 330 },
    { moldType: 'OV-0389', target: 330 }, { moldType: 'OV-0220W', target: 330 }, { moldType: 'OV-0220M', target: 330 },
    { moldType: 'OE-0373', target: 330 }, { moldType: 'OV-0345', target: 400 }, { moldType: 'OV-0402', target: 400 },
    { moldType: 'OE-0002', target: 330 }, { moldType: 'OS-0111(MN-1ot)', target: 330 }, { moldType: 'OI-0023', target: 330 },
    { moldType: 'OE-0199', target: 290 }, { moldType: 'OV-0422', target: 330 }, { moldType: 'OE-0555', target: 330 },
    { moldType: 'OV-0360', target: 330 }, { moldType: 'OV-0373', target: 330 }, { moldType: 'OV-0385', target: 330 },
    { moldType: 'OV-0389-1', target: 330 }, { moldType: 'OV-0394', target: 290 }, { moldType: 'OV-0398', target: 330 },
    { moldType: 'OV-0408', target: 330 }, { moldType: 'OV-0419', target: 330 }, { moldType: 'OV-0420', target: 330 },
    { moldType: 'OV-0446', target: 330 }
  ];

  for (const d of data) {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO mold_targets (mold_type, target_per_hour) VALUES (?, ?)',
      args: [d.moldType, d.target]
    });
  }
  console.log('Productivity updated successfully');
  process.exit(0);
}

updateMolds();
