import ExcelJS from "exceljs";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  fileName: string = "export"
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  // Set columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" }, // Primary color
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "left" };

  // Add data rows
  data.forEach((item) => {
    const row: any = {};
    columns.forEach((col) => {
      const value = item[col.key];
      // Handle dates
      if (value instanceof Date) {
        row[col.key] = value.toLocaleString();
      } else if (typeof value === "boolean") {
        row[col.key] = value ? "Yes" : "No";
      } else {
        row[col.key] = value ?? "";
      }
    });
    worksheet.addRow(row);
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Create blob and download
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

