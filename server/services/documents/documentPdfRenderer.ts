import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PDFKitDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import logger from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function renderSimplePdf(title: string, lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText(title, {
    x: 50,
    y: 800,
    size: 20,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  let y = 770;
  for (const line of lines) {
    if (y < 60) break;
    page.drawText(line, {
      x: 50,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;
  }

  const bytes = await pdf.save();
  logger.info('[DocumentService] generated PDF', { title, lines: lines.length });
  return Buffer.from(bytes);
}

export async function renderInvoicePdf(lines: string[]): Promise<Buffer> {
  const doc = new PDFKitDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  try {
    doc.font(fileURLToPath(new URL('../../assets/fonts/DejaVuSans.ttf', import.meta.url)));
    // PDFKit exposes the underlying fontkit font only through its internal font.
    const font = (doc as PDFKit.PDFDocument & {
      _font: { font: { hasGlyphForCodePoint(codePoint: number): boolean } };
    })._font.font;
    for (const character of lines.join('')) {
      if (!font.hasGlyphForCodePoint(character.codePointAt(0)!)) {
        throw new AppError('This invoice contains characters not supported by PDF export.', 400);
      }
    }
    doc.fillColor('#1E293B').fontSize(20).text('Lease Invoice').moveDown();
    doc.fontSize(11);
    for (const line of lines) {
      // Shape Arabic phrases together (including spaces), but keep Latin and
      // numeric runs LTR. Explicit features bypass PDFKit's per-word cache,
      // which otherwise reverses glyphs without reversing Arabic word order.
      const runs = line.match(/(?:(?=\p{L}|\p{M})[\p{Script=Arabic}\p{M}])+(?:[ \t]+(?:(?=\p{L}|\p{M})[\p{Script=Arabic}\p{M}])+)*|\p{N}+|[^\p{Script=Arabic}\p{M}]+|./gu) || [];
      runs.forEach((run, index) => {
        doc.text(run, { features: ['rtla'], continued: index < runs.length - 1 });
      });
      doc.moveDown(0.5);
    }
    doc.end();
  } catch (error) {
    doc.destroy(error instanceof Error ? error : new Error('Invoice PDF rendering failed'));
  }
  return completed;
}
