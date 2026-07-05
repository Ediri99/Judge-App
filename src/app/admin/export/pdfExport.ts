export interface PdfSection {
  heading: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface PdfReport {
  title: string;
  subtitle: string;
  sections: PdfSection[];
  fileName: string;
}

export async function downloadPdfReport(report: PdfReport) {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  (pdfMake as unknown as { vfs: unknown }).vfs = pdfFonts;

  const content: Record<string, unknown>[] = [
    { text: report.title, style: 'title' },
    { text: report.subtitle, style: 'subtitle', margin: [0, 0, 0, 16] },
  ];

  report.sections.forEach((section, index) => {
    content.push({ text: section.heading, style: 'sectionHeading', margin: [0, index === 0 ? 0 : 16, 0, 8] });
    content.push({
      table: {
        headerRows: 1,
        widths: section.headers.map(() => '*'),
        body: [section.headers, ...section.rows.map((row) => row.map((cell) => String(cell)))],
      },
      layout: 'lightHorizontalLines',
    });
  });

  const docDefinition = {
    content,
    styles: {
      title: { fontSize: 20, bold: true },
      subtitle: { fontSize: 11, color: '#54606F' },
      sectionHeading: { fontSize: 13, bold: true },
    },
    defaultStyle: { fontSize: 9 },
    pageMargins: [32, 32, 32, 32],
  };

  pdfMake.createPdf(docDefinition as unknown as Parameters<typeof pdfMake.createPdf>[0]).download(report.fileName);
}
