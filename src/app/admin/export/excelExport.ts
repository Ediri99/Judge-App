export interface SheetSpec {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export async function downloadWorkbook(sheets: SheetSpec[], fileName: string) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, fileName);
}
