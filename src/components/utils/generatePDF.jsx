export const generatePDF = async (htmlContent) => {
  try {
    // Create a styled HTML document
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6;
              color: #333;
            }
            .report-container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            h1 {
              color: #2563eb;
              font-size: 24px;
              margin-bottom: 16px;
            }
            h2 {
              color: #1e40af;
              font-size: 20px;
              margin: 24px 0 16px;
            }
            h3 {
              color: #1e40af;
              font-size: 16px;
              margin: 16px 0 8px;
            }
            .report-date { 
              color: #666; 
              font-style: italic;
              margin-bottom: 24px;
            }
            .metrics-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin: 24px 0;
            }
            .metric { 
              padding: 20px; 
              background: #f8fafc; 
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .metric h3 {
              margin-top: 0;
              color: #64748b;
              font-size: 14px;
            }
            .metric p {
              margin: 8px 0 0;
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
            }
            .chart { 
              margin: 32px 0;
              padding: 16px;
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .chart h3 {
              margin-top: 0;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 24px 0;
            }
            th, td { 
              padding: 12px; 
              border: 1px solid #e2e8f0; 
              text-align: left;
            }
            th { 
              background: #f8fafc; 
              font-weight: 600;
            }
            td {
              background: #fff;
            }
            img {
              max-width: 100%;
              height: auto;
              margin: 16px 0;
              border-radius: 4px;
            }
            section {
              margin: 32px 0;
            }
            .details table tr:nth-child(even) td {
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    // Create a Blob from the HTML content
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    return { url };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};