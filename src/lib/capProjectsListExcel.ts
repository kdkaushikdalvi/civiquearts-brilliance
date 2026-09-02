import ExcelJS from "exceljs";
import { Assignment } from "@/types/pm";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC6EFCE" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = THIN_BORDER as ExcelJS.Borders;
}

function autofitColumns(sheet: ExcelJS.Worksheet, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    let maxLen = 10;
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const val = row.getCell(c).value;
      const text = val == null ? "" : String(val);
      maxLen = Math.max(maxLen, text.length + 2);
    });
    sheet.getColumn(c).width = Math.min(maxLen, 90);
  }
}

export type CapProjectsListRow =
  | { kind: "header" }
  | { kind: "project"; projectName: string }
  | { kind: "site"; srNo: number; siteName: string };

/** Group by project name (A–Z), sites sorted A–Z within each project. */
export function buildCapProjectsListRows(assignments: Assignment[]): CapProjectsListRow[] {
  const byProject = new Map<string, Set<string>>();

  for (const a of assignments) {
    const project = a.projectName.trim();
    const site = a.siteName.trim();
    if (!project) continue;
    if (!byProject.has(project)) byProject.set(project, new Set());
    if (site) byProject.get(project)!.add(site);
  }

  const projects = [...byProject.keys()].sort((x, y) =>
    x.localeCompare(y, undefined, { sensitivity: "base" }),
  );

  const rows: CapProjectsListRow[] = [{ kind: "header" }];

  for (const projectName of projects) {
    rows.push({ kind: "project", projectName });
    const sites = [...(byProject.get(projectName) ?? [])].sort((x, y) =>
      x.localeCompare(y, undefined, { sensitivity: "base" }),
    );
    sites.forEach((siteName, i) => {
      rows.push({ kind: "site", srNo: i + 1, siteName });
    });
  }

  return rows;
}

export async function buildCapProjectsListWorkbook(assignments: Assignment[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Sheet1");
  const model = buildCapProjectsListRows(assignments);

  let excelRow = 1;

  for (const item of model) {
    const row = sheet.getRow(excelRow);

    if (item.kind === "header") {
      row.getCell(1).value = "Sr No.";
      row.getCell(2).value = "Projects";
      row.getCell(3).value = "Accounting Code";
      for (let c = 1; c <= 3; c++) {
        const cell = row.getCell(c);
        cell.font = { bold: true };
        cell.fill = HEADER_FILL;
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        applyBorder(cell);
      }
    } else if (item.kind === "project") {
      // Keep project groups visually separated in the generated workbook.
      if (excelRow > 2) {
        excelRow++;
      }
      const projectRow = sheet.getRow(excelRow);
      projectRow.getCell(1).value = "";
      projectRow.getCell(2).value = item.projectName;
      projectRow.getCell(3).value = "";
      projectRow.getCell(2).font = { bold: true };
      projectRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      projectRow.getCell(2).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      projectRow.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
      for (let c = 1; c <= 3; c++) applyBorder(projectRow.getCell(c));
      projectRow.commit();
      excelRow++;
      continue;
    } else {
      row.getCell(1).value = item.srNo;
      row.getCell(2).value = item.siteName;
      row.getCell(3).value = "";
      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(2).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      row.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
      for (let c = 1; c <= 3; c++) applyBorder(row.getCell(c));
    }

    row.commit();
    excelRow++;
  }

  autofitColumns(sheet, 3);
  return wb;
}

export function capProjectsListFilename(monthName: string, year: number): string {
  return `CAP Projects List ${monthName} ${year}.xlsx`;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function countCapSiteRows(assignments: Assignment[]): number {
  return buildCapProjectsListRows(assignments).filter((r) => r.kind === "site").length;
}

export async function generateAndDownloadCapProjectsList(
  assignments: Assignment[],
  monthName: string,
  year: number,
): Promise<number> {
  const wb = await buildCapProjectsListWorkbook(assignments);
  const buf = await wb.xlsx.writeBuffer();
  const filename = capProjectsListFilename(monthName, year);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, filename);
  return countCapSiteRows(assignments);
}
