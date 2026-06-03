const fs = require('fs');
const Tesseract = require('tesseract.js');

async function test() {
  const worker = await Tesseract.createWorker('ron');
  // Wait, Tesseract.js in node can only process images, not PDFs natively unless we convert to image.
  // I don't have pdf.js set up here easily.
  console.log("Cannot run easily without canvas");
}
test();
