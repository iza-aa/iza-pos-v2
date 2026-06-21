import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type {
  ReportCell,
  ReportExportOptions,
} from "@/lib/utils/reportExportTypes";
import {
  formatReportValue,
  getReportCellHeader,
} from "@/lib/utils/reportFormatting";

const BRAND_DARK = "111827";
const BRAND_ACCENT = "4C46DA";
const LIGHT_ROW = "F8FAFC";
const BORDER = "D1D5DB";

const asText = (value: ReportCell) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

export async function buildDocxReport(options: ReportExportOptions) {
  const maxColumns = Math.max(
    1,
    ...options.sheets.flatMap((sheet) => sheet.rows.map((row) => row.length)),
  );
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [new TextRun({ text: options.title, bold: true, size: 36, color: BRAND_DARK })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: options.subtitle || "Owner dashboard report", size: 22, color: BRAND_ACCENT })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleString("id-ID")}`, size: 18, color: "6B7280" })],
      spacing: { after: 260 },
    }),
  ];

  options.sheets.forEach((sheet) => {
    children.push(new Paragraph({
      text: sheet.name,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 220, after: 100 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: sheet.description || "Detailed data for this report section.",
        italics: true,
        size: 17,
        color: "6B7280",
      })],
      spacing: { after: 100 },
    }));

    if (!sheet.rows.length) {
      children.push(new Paragraph({ text: "No data available." }));
      return;
    }

    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));
    const normalizedRows = sheet.rows.map((row, rowIndex) =>
      Array.from({ length: columnCount }, (_, columnIndex) => {
        const value = row[columnIndex];
        return rowIndex === 0
          ? asText(value)
          : formatReportValue(
              value,
              getReportCellHeader(sheet.rows, rowIndex, columnIndex),
            );
      }),
    );

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: normalizedRows.map((row, rowIndex) => new TableRow({
        tableHeader: rowIndex === 0,
        cantSplit: true,
        children: row.map((value, columnIndex) => new TableCell({
          shading: rowIndex === 0
            ? { type: ShadingType.CLEAR, color: "auto", fill: BRAND_ACCENT }
            : rowIndex % 2 === 0
              ? { type: ShadingType.CLEAR, color: "auto", fill: LIGHT_ROW }
              : undefined,
          margins: { top: 90, bottom: 90, left: 100, right: 100 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
            left: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
            right: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
          },
          children: [new Paragraph({
            alignment:
              rowIndex > 0 &&
              typeof sheet.rows[rowIndex]?.[columnIndex] === "number"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,
            children: [new TextRun({
              text: asText(value),
              bold: rowIndex === 0,
              color: rowIndex === 0 ? "FFFFFF" : BRAND_DARK,
              size: maxColumns > 8 ? 15 : 18,
            })],
          })],
        })),
      })),
    }));
  });

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20, color: BRAND_DARK },
          paragraph: { spacing: { after: 80, line: 276 } },
        },
      },
      paragraphStyles: [{
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, color: BRAND_DARK, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 100 } },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: maxColumns > 7 ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: { top: 720, right: 540, bottom: 720, left: 540 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "IZA POS | Page ", color: "6B7280", size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], color: "6B7280", size: 16 }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(document);
}
