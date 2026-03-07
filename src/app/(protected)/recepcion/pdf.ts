import JsBarcode from "jsbarcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toAscii(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function clampLabel(value: string, maxLength: number) {
  return toAscii(value).slice(0, maxLength);
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function generateBarcodePng(code: string) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, toAscii(code) || "0", {
    format: "CODE128",
    width: 1.6,
    height: 38,
    displayValue: false,
    margin: 0,
  });

  return {
    bytes: dataUrlToBytes(canvas.toDataURL("image/png")),
    width: canvas.width,
    height: canvas.height,
  };
}

export type StickerSpecimen = {
  sampleId: string;
  specimenCode: string;
};

export type StickerPdfInput = {
  specimens: StickerSpecimen[];
  workOrderCode: string;
  patientName: string;
};

/** Create a reliable PDF with one printable sticker per specimen. */
export async function createStickerPdf(input: StickerPdfInput): Promise<Blob> {
  const { specimens, workOrderCode, patientName } = input;

  if (specimens.length === 0) {
    return new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" });
  }

  const pdfDoc = await PDFDocument.create();
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const STICKER_W = 144;
  const STICKER_H = 90;
  const COLS = 4;
  const ROWS = 8;
  const MARGIN = 18;
  const GAP = 4;
  const PER_PAGE = COLS * ROWS;

  const otLabel = `OT: ${clampLabel(workOrderCode, 24)}`;
  const npLabel = `NP: ${clampLabel(patientName, 28)}`;

  for (let index = 0; index < specimens.length; index += 1) {
    const position = index % PER_PAGE;
    const col = position % COLS;
    const row = Math.floor(position / COLS);
    const page = position === 0 ? pdfDoc.addPage([PAGE_W, PAGE_H]) : pdfDoc.getPages().at(-1)!;

    const x = MARGIN + col * (STICKER_W + GAP);
    const y = PAGE_H - MARGIN - STICKER_H - row * (STICKER_H + GAP);
    const specimen = specimens[index];

    const barcode = generateBarcodePng(specimen.sampleId);
    const barcodeImage = await pdfDoc.embedPng(barcode.bytes);
    const barcodeScale = Math.min((STICKER_W - 12) / barcode.width, 28 / barcode.height);
    const barcodeWidth = barcode.width * barcodeScale;
    const barcodeHeight = barcode.height * barcodeScale;
    const barcodeX = x + (STICKER_W - barcodeWidth) / 2;
    const barcodeY = y + STICKER_H - barcodeHeight - 8;

    page.drawRectangle({
      x,
      y,
      width: STICKER_W,
      height: STICKER_H,
      borderColor: rgb(0.12, 0.12, 0.12),
      borderWidth: 0.7,
      color: rgb(1, 1, 1),
    });

    page.drawImage(barcodeImage, {
      x: barcodeX,
      y: barcodeY,
      width: barcodeWidth,
      height: barcodeHeight,
    });

    page.drawText(clampLabel(specimen.specimenCode, 30), {
      x: x + 6,
      y: barcodeY - 8,
      size: 6,
      font: monoFont,
      color: rgb(0.22, 0.22, 0.22),
    });

    page.drawText(otLabel, {
      x: x + 6,
      y: y + 26,
      size: 7,
      font: bodyFont,
      color: rgb(0.08, 0.08, 0.08),
    });

    page.drawText(npLabel, {
      x: x + 6,
      y: y + 16,
      size: 7,
      font: bodyFont,
      color: rgb(0.08, 0.08, 0.08),
    });

    page.drawText(`CM: ${clampLabel(specimen.specimenCode, 26)}`, {
      x: x + 6,
      y: y + 6,
      size: 7,
      font: bodyFont,
      color: rgb(0.08, 0.08, 0.08),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBytesCopy = new Uint8Array(pdfBytes);

  return new Blob([pdfBytesCopy], { type: "application/pdf" });
}

export function createSimplePdf(lines: string[]) {
  const safeLines = lines.map((line) => escapePdfText(toAscii(line))).slice(0, 42);
  const stream = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...safeLines.flatMap((line, index) =>
      index === 0 ? [`(${line}) Tj`] : ["0 -16 Td", `(${line}) Tj`]
    ),
    "ET",
  ].join("\n");

  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  const push = (chunk: string) => {
    pdf += chunk;
  };
  const currentOffset = () => encoder.encode(pdf).length;

  offsets[1] = currentOffset();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  offsets[2] = currentOffset();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  offsets[3] = currentOffset();
  push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  offsets[4] = currentOffset();
  push(
    `4 0 obj\n<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  offsets[5] = currentOffset();
  push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const xrefOffset = currentOffset();
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob([pdf], { type: "application/pdf" });
}
