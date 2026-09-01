// ===================== PRINTER LABEL - Putian 80L (ESC/POS) =====================
function getPutian80LCommand(totalW, h, gap, ox, oy, cols, nama, harga, barcodeText, showNama, showHarga, showBarcode) {
  var cmd = '';
  
  // ESC/POS Initialize
  cmd += '\x1B\x40';  // ESC @ - Initialize printer
  
  for (var col = 0; col < cols; col++) {
    var w = totalW / cols;
    var x = (col * w) + 5 + ox;
    
    // Set label width and height
    cmd += '\x1D\x57' + String.fromCharCode(Math.round(w / 8)) + String.fromCharCode(0);  // GS W - Set print area width
    cmd += '\x1D\x68' + String.fromCharCode(Math.round(h / 8));  // GS h - Set label height
    
    // Product Name
    if (showNama) {
      var maxChars = 20;
      var line1 = nama;
      var line2 = '';
      if (nama.length > maxChars) {
        var splitAt = nama.lastIndexOf(' ', maxChars);
        if (splitAt === -1) splitAt = maxChars;
        line1 = nama.substring(0, splitAt);
        line2 = nama.substring(splitAt).trim();
      }
      
      // Bold text
      cmd += '\x1B\x45\x01';  // ESC E 1 - Bold ON
      cmd += '\x1B\x61\x01';  // ESC a 1 - Center align
      cmd += line1 + '\n';
      if (line2) {
        cmd += line2 + '\n';
      }
      cmd += '\x1B\x45\x00';  // ESC E 0 - Bold OFF
      cmd += '\x1B\x61\x00';  // ESC a 0 - Left align
    }
    
    // Barcode
    if (showBarcode) {
      // Feed 5mm
      cmd += '\x1B\x4A\x10';  // ESC J 16 - Feed 5mm
      
      cmd += '\x1D\x68\x40';  // GS h 64 - Barcode height
      cmd += '\x1D\x77\x02';  // GS w 2 - Barcode width
      cmd += '\x1D\x48\x00';  // GS H 0 - HRI position (not printed)
      cmd += '\x1D\x66\x01';  // GS f 1 - Select font for HRI
      cmd += '\x1D\x6B\x49';  // GS k I - Print CODE128 barcode
      cmd += String.fromCharCode(barcodeText.length);
      cmd += barcodeText;
      cmd += '\n';
    }
    
    // Price
    if (showHarga) {
      cmd += '\x1B\x61\x01';  // ESC a 1 - Center align
      cmd += '\x1B\x21\x10';  // ESC ! 16 - Double height
      cmd += harga + '\n';
      cmd += '\x1B\x21\x00';  // ESC ! 0 - Normal size
      cmd += '\x1B\x61\x00';  // ESC a 0 - Left align
    }
    
    // Barcode number
    cmd += '\x1B\x61\x01';  // ESC a 1 - Center align
    cmd += '\x1B\x4D\x00';  // ESC M 0 - Small font (7x9)
    cmd += barcodeText + '\n';
    cmd += '\x1B\x4D\x01';  // ESC M 1 - Normal font (9x17)
    cmd += '\x1B\x61\x00';  // ESC a 0 - Left align
  }
  
  // Cut paper
  cmd += '\n\n';
  cmd += '\x1D\x56\x00';  // GS V 0 - Full cut
  
  return cmd;
}