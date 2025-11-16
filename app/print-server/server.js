const express = require('express');
const bodyParser = require('body-parser');
const printer = require('printer'); // Windows printer support
const printerName = 'POS-210'; 

const app = express();
app.use(bodyParser.json());

const PORT = 3001;

// Test available printers
console.log('Available printers:', printer.getPrinters());

// POST /print route
app.post('/print', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.items || !data.total) {
      return res.status(400).json({ success: false, error: 'Invalid receipt data' });
    }

    // Construct the receipt text
    let receiptText = '';
    receiptText += `CashTeen Payment System\n`;
    receiptText += `-----------------------------\n`;
    receiptText += `Receipt ID: ${data.id}\n`;
    receiptText += `Customer: ${data.customerName}\n`;
    receiptText += `Date: ${data.date}\n`;
    if (data.oldBalance !== undefined && data.newBalance !== undefined) {
      receiptText += `Old Balance: ₱${data.oldBalance.toFixed(2)}\n`;
      receiptText += `New Balance: ₱${data.newBalance.toFixed(2)}\n`;
    }
    receiptText += `-----------------------------\n`;
    data.items.forEach(item => {
      receiptText += `${item.name} x${item.quantity}  ₱${(item.price*item.quantity).toFixed(2)}\n`;
    });
    receiptText += `-----------------------------\n`;
    receiptText += `TOTAL: ₱${data.total.toFixed(2)}\n`;
    receiptText += `\nThank you for your purchase!\n\n\n`;

    // Replace "PT-210" with your printer name exactly as shown in Windows
    const printerName = 'PT-210'; 

    printer.printDirect({
      data: receiptText,
      printer: printerName,
      type: 'RAW',
      success: function(jobID) {
        console.log(`Sent to printer ${printerName}, jobID: ${jobID}`);
        res.json({ success: true, message: 'Printed successfully' });
      },
      error: function(err) {
        console.error('Print error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Print server running on http://localhost:${PORT}`);
});
