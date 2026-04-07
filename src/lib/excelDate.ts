export function excelToDate(excelSerial: number): string {
  // Convert based on UTC to avoid timezone shift issues.
  // 25569 is the number of days between Excel EPOCH (1899-12-30) and UNIX EPOCH (1970-01-01)
  const daysSince1970 = excelSerial - 25569;
  const msSince1970 = daysSince1970 * 86400 * 1000;
  
  const date = new Date(msSince1970);
  
  const YYYY = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(date.getUTCDate()).padStart(2, '0');
  const HH = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

export function dateToExcel(dateString: string): number {
  let dStr = dateString;
  if (!dStr.includes('T') && dStr.includes(' ')) {
    dStr = dStr.replace(' ', 'T');
  }
  if (!dStr.endsWith('Z') && dStr.includes('T')) {
    dStr += 'Z';
  } else if (!dStr.includes('T')) {
    dStr += 'T00:00:00Z';
  }

  const date = new Date(dStr);
  const msSince1970 = date.getTime();
  const daysSince1970 = msSince1970 / (86400 * 1000);
  
  return daysSince1970 + 25569;
}
