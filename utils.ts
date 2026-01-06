
import { CURRENCY_SYMBOL } from './constants';
import * as XLSX from 'xlsx';

export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateSaleNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SALE-${dateStr}-${random}`;
};

export const generateSKU = (name: string): string => {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = (cleanName.slice(0, 3) || 'ITM').padEnd(3, 'X');
  const random = Math.floor(Math.random() * 1000000).toString(36).toUpperCase().slice(-4);
  return `${prefix}-${random}`;
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB');
};

export const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('en-GB');
};

/**
 * Downloads data as either CSV or Excel.
 */
export const downloadData = (data: any[], filename: string, type: 'csv' | 'xlsx') => {
  if (data.length === 0) return;
  const fullFilename = `${filename}_${new Date().toISOString().slice(0, 10)}`;

  if (type === 'csv') {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          const stringVal = String(val);
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fullFilename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${fullFilename}.xlsx`);
  }
};

/**
 * Parses a File object (CSV or XLSX) into an array of objects.
 */
export const parseFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (extension === 'csv') {
          const text = data as string;
          const lines = text.split('\n').filter(l => l.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

          const results = lines.slice(1).map(l => {
            const values = l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, i) => {
              row[h] = values[i];
            });
            return row;
          });
          resolve(results);
        } else {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          resolve(jsonData);
        }
      } catch (err) {
        reject(err);
      }
    };

    if (extension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};
