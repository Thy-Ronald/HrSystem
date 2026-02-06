import { formatDate } from '../../../utils/format';
import { calculateExpirationDate } from './contractHelpers';

/**
 * Export contracts to Spreadsheet format (Excel .xlsx)
 * 
 * Features:
 * - Bold headers with light gray background for better visibility
 * - Auto-sized columns to ensure all content is visible (no truncation)
 * - Professional Excel formatting (.xlsx format)
 * - Falls back to CSV if ExcelJS library is not available
 * 
 * @param {Array} contracts - Array of contract objects
 * @param {Date} currentTime - Current time for status calculation
 * @returns {Promise<void>}
 */
export async function exportContractsToSpreadsheet(contracts, currentTime = new Date()) {
  if (!contracts || contracts.length === 0) {
    return;
  }

  try {
    // Dynamic import to keep bundle small
    let ExcelJS;
    try {
      const ExcelJSModule = await import('exceljs');
      // Handle both CommonJS and ES module exports
      ExcelJS = ExcelJSModule.default || ExcelJSModule;

      // Verify Workbook is available
      if (!ExcelJS || !ExcelJS.Workbook) {
        throw new Error('ExcelJS module structure not recognized');
      }
    } catch (importError) {
      console.error('ExcelJS library not found. Install with: npm install exceljs', importError);
      alert('Excel export requires exceljs library. Please install it:\n\nnpm install exceljs\n\nFalling back to CSV format.');
      exportContractsToCSV(contracts, currentTime);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contracts');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name' },
      { header: 'Position', key: 'position' },
      { header: 'Assessment Date', key: 'assessmentDate' },
      { header: 'Basic Salary', key: 'basicSalary' },
      { header: 'Expiration Date', key: 'expirationDate' }
    ];

    // Add data
    contracts.forEach(contract => {
      const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths);
      const expirationDateStr = expirationDate
        ? formatDate(expirationDate)
        : (contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A');

      worksheet.addRow({
        name: contract.name || '',
        position: contract.position || '',
        assessmentDate: formatDate(contract.assessmentDate),
        basicSalary: contract.basicSalary || 0,
        expirationDate: expirationDateStr
      });
    });

    // Style headers: Bold and Light Gray background
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

    // Auto-fit columns based on content to ensure all data is visible
    // This prevents truncation issues like "########" for dates
    worksheet.columns.forEach((column, index) => {
      let maxColumnLength = 0;

      // Check header length
      const headerLength = column.header ? column.header.length : 0;
      maxColumnLength = Math.max(maxColumnLength, headerLength);

      // Check all cell values in the column
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value;
        if (cellValue !== null && cellValue !== undefined) {
          const cellLength = cellValue.toString().length;
          if (cellLength > maxColumnLength) {
            maxColumnLength = cellLength;
          }
        }
      });

      // Set width with padding (minimum 12 characters, add 4 for padding)
      // This ensures dates and long names are fully visible
      column.width = Math.max(12, maxColumnLength + 4);
    });

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `contracts_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export failed, falling back to CSV:', error);
    exportContractsToCSV(contracts, currentTime);
  }
}

/**
 * Export contracts to CSV format (Fallback)
 * @param {Array} contracts - Array of contract objects
 * @param {Date} currentTime - Current time for status calculation
 */
export function exportContractsToCSV(contracts, currentTime = new Date()) {
  if (!contracts || contracts.length === 0) {
    return;
  }

  // Define CSV headers
  const headers = [
    'Name',
    'Position',
    'Assessment Date',
    'Basic Salary',
    'Expiration Date'
  ];

  // Convert contracts to CSV rows
  const rows = contracts.map((contract) => {
    // Calculate expiration date
    const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths);
    const expirationDateStr = expirationDate
      ? formatDate(expirationDate)
      : (contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A');

    return [
      escapeCSV(contract.name || ''),
      escapeCSV(contract.position || ''),
      formatDate(contract.assessmentDate),
      contract.basicSalary || 0, // Export as raw number to avoid CSV column splitting and allow Excel formatting
      expirationDateStr
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `contracts_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export contracts to PDF format
 * @param {Array} contracts - Array of contract objects
 * @param {Date} currentTime - Current time for status calculation
 */
export async function exportContractsToPDF(contracts, currentTime = new Date()) {
  if (!contracts || contracts.length === 0) {
    return;
  }

  try {
    // Dynamic import with error handling for missing library
    let jsPDF, autoTable;

    try {
      const jspdfModule = await import(/* @vite-ignore */ 'jspdf');
      jsPDF = jspdfModule.jsPDF || jspdfModule.default;

      const autotableModule = await import(/* @vite-ignore */ 'jspdf-autotable');
      autoTable = autotableModule.default;
    } catch (importError) {
      alert('PDF export requires jsPDF library. Please install it:\n\nnpm install jspdf jspdf-autotable');
      console.error('PDF library not found. Install with: npm install jspdf jspdf-autotable', importError);
      return;
    }

    if (!jsPDF || !autoTable) {
      alert('PDF export requires jsPDF library. Please install it:\n\nnpm install jspdf jspdf-autotable');
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text('Employee Contracts', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date())}`, 14, 22);

    // Prepare table data
    const tableData = contracts.map((contract) => {
      const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths);
      const expirationDateStr = expirationDate
        ? formatDate(expirationDate)
        : (contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A');

      return [
        contract.name || '',
        contract.position || '',
        formatDate(contract.assessmentDate),
        (contract.basicSalary || 0).toLocaleString(), // Keep formatting for PDF display
        expirationDateStr
      ];
    });

    // Add table
    autoTable(doc, {
      head: [['Name', 'Position', 'Assessment Date', 'Basic Salary', 'Expiration Date']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 133, 244], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 28 }
    });

    // Save PDF
    doc.save(`contracts_export_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    alert('Error generating PDF. Please ensure jsPDF is installed:\n\nnpm install jspdf jspdf-autotable');
    console.error('PDF export error:', error);
  }
}

/**
 * Escape CSV field values
 * @param {string} value - Value to escape
 * @returns {string} - Escaped value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
