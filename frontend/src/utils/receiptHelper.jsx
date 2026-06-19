import { renderToString } from 'react-dom/server';
import PrintableReceipt from '../components/common/PrintableReceipt';

export const printReceipt = (receipt, title = 'Print Receipt') => {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print receipts.');
    return;
  }
  
  // Render receipt to HTML string
  const componentHtml = renderToString(
    <PrintableReceipt receipt={receipt} />
  );

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
          body { background: #f9fafb; padding: 20px; font-family: Arial, sans-serif; }
          .print-container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #C9A227; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            🖨️ Print Receipt
          </button>
        </div>
        <div class="print-container">
          ${componentHtml}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  
  win.onload = () => {
    win.focus();
  };
};
