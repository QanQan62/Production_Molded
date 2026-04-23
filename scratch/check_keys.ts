
import { dbShared } from '../src/lib/dbShared';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkKeys() {
    const rawQuery = `SELECT \"PRO ORDER\", \"Brand\", \"ArticleCode\", \"QtyOrder\", \"MOLD_IN(PRO)\", \"MOLD_OUT(PRO)\", \"Finish Date(PPC)\", \"BOM\", \"#MOLDTYPE\", \"Status\", \"LINE CODE\", \"LEAN_IN(PRO)\", \"#LAST\", \"Recieved Logo\", \"CODE LOGO1\", \"THĂNG HOA\", \"Description PU1\", \"Description FB\"
                      FROM \"OVN_DATA\" 
                      WHERE \"PRO ORDER\" = 'RPRO-260331-0072'`;
    
    // @ts-ignore
    const res = await dbShared.session.client.execute(rawQuery);
    const row = res.rows[0];
    console.log("Keys in row:", Object.keys(row));
    console.log("Value for 'THĂNG HOA':", row["THĂNG HOA"]);
    console.log("Value for 'PRO ORDER':", row["PRO ORDER"]);
}

checkKeys().catch(console.error);
