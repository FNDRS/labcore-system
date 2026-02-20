function toAscii(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createSimplePdf(lines: string[]) {
  const safeLines = lines.map((line) => escapePdfText(toAscii(line))).slice(0, 42);
  const stream = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : ["0 -16 Td", `(${line}) Tj`])),
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
  push(`4 0 obj\n<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream\nendobj\n`);
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
