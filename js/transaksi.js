// ===================== TRANSAKSI.JS =====================
var cart = [];
var searchTimer = null;
var appSettings = {};
var isAdmin = false;
var totalDiskonValue = 0;
var bayarValue = 0;
var cachedSettings = null;
var currentPesananNo = null;
var currentVoucherData = null;

async function setupTransaksi() {
  var role = currentUser ? currentUser.role : 'kasir';
  isAdmin = (role === 'admin');

  if (typeof loadDiscountSettings === 'function') {
    await loadDiscountSettings();
  }
  
  if (typeof loadPesananSettings === 'function') {
    await loadPesananSettings();
  }
  
  if (typeof loadTaxSettings === 'function') {
    await loadTaxSettings();
  }
  
  if (typeof loadPaymentSettings === 'function') {
    await loadPaymentSettings();
  }

  try {
    appSettings = await getSettings();
    cachedSettings = appSettings;
  } catch (e) {
    appSettings = {};
  }

  var summaryContainer = document.getElementById('summaryContainer');
  if (!summaryContainer) {
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'summaryContainer';
    summaryContainer.style.cssText = 'background: #f0f4f8; padding: 12px; border-radius: 8px; margin-top: 8px;';
    var cartTable = document.getElementById('cartTable');
    cartTable.parentNode.insertBefore(summaryContainer, cartTable.nextSibling);
    summaryContainer.innerHTML = '<div id="diskonContainer"></div><div id="voucherContainer"></div><div id="pembayaranSummary" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #d0d8e0; padding-top:8px;"><div><strong style="font-size:16px;">PEMBAYARAN:</strong> <div style="display:inline-flex;gap:8px;flex-wrap:wrap;" id="paymentButtonsContainer"></div></div><div style="text-align:right;"><div style="font-weight:bold;">BAYAR: Rp <span id="bayarDisplay">0</span></div><div style="font-weight:bold;">Kembalian: Rp <span id="kembalianDisplay">0</span></div></div></div>';
  }

  bayarValue = 0;
  updateBayarDisplay();

  document.getElementById('scanInputTrans').onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var b = e.target.value.trim();
      if (b) { e.target.value = ''; tambahProdukDariScan(b); }
    }
  };

  var searchInput = document.getElementById('searchProduct');
  if (searchInput) {
    searchInput.oninput = function() { searchProductFn(searchInput.value); };
    searchInput.onfocus = function() { searchProductFn(searchInput.value); };
  }

  totalDiskonValue = 0;
  currentVoucherData = null;
  renderCart();
  renderPesananButtons();
  
  setTimeout(function() {
    renderPaymentButtons();
  }, 1000);
}

function renderPaymentButtons() {
  var container = document.getElementById('paymentButtonsContainer');
  if (!container) return;
  
  var html = '';
  
  if (typeof paymentSettings !== 'undefined' && paymentSettings.methods) {
    paymentSettings.methods.forEach(function(m) {
      if (m.aktif) {
        var btnId = m.nama.replace(/[^a-zA-Z0-9]/g, '');
        html += '<button class="btn btn-tunai" onclick="bukaPopup' + btnId + '()">' + m.nama + '</button>';
      }
    });
  } else {
    html += '<button class="btn btn-tunai" onclick="bukaPopupTUNAI()">TUNAI</button>';
  }
  
  container.innerHTML = html;
}

function renderPesananButtons() {
  var showSimpanPesanan = typeof isSimpanPesananActive === 'function' ? isSimpanPesananActive() : true;
  var showPesananTersimpan = typeof isPesananTersimpanActive === 'function' ? isPesananTersimpanActive() : true;
  
  var container = document.getElementById('pesananButtonsContainer');
  if (!container) return;
  
  var html = '';
  if (showSimpanPesanan) {
    html += '<button class="btn" onclick="simpanPesanan()" style="background:#ff9800;">💾 Simpan Pesanan</button>';
  }
  if (showPesananTersimpan) {
    html += '<button class="btn" onclick="tampilkanPesananTersimpan()">📋 Pesanan Tersimpan</button>';
  }
  container.innerHTML = html;
}

function updateBayarDisplay() {
  var d = document.getElementById('bayarDisplay');
  if (d) d.textContent = bayarValue.toLocaleString('id');
  hitungKembalian();
}

function bukaPopupTUNAI() {
  var modal = document.createElement('div');
  modal.id = 'popupTunaiModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:360px;text-align:center;">';
  html += '<h3>💰 Pembayaran TUNAI</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
  [100000,50000,20000,10000,5000,2000,1000,500,200].forEach(function(n) { 
    html += '<button class="btn btn-sm" onclick="tambahNominalPopup(' + n + ')" style="padding:10px;border:1px solid #ddd;border-radius:6px;">Rp ' + n.toLocaleString('id') + '</button>'; 
  });
  html += '</div>';
  html += '<input type="number" id="inputBayarPopup" value="' + bayarValue + '" style="width:100%;padding:12px;font-size:18px;text-align:right;border:2px solid #009688;border-radius:8px;" onfocus="this.select()">';
  html += '<div style="margin-top:12px;display:flex;gap:8px;">';
  html += '<button class="btn-sm" onclick="simpanTunai()" style="flex:1;background:#009688;color:white;padding:12px;border:none;border-radius:8px;">✅ Simpan</button>';
  html += '<button class="btn-sm btn-danger" onclick="document.getElementById(\'popupTunaiModal\').remove()" style="flex:1;">Batal</button>';
  html += '</div></div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
  setTimeout(function() { document.getElementById('inputBayarPopup').focus(); }, 200);
}

function bukaPopupQRIS() {
  var modal = document.createElement('div');
  modal.id = 'qrisPopupModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  var totalEl = document.getElementById('totalCart');
  var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
  
  var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:320px;text-align:center;">';
  html += '<h3>📱 QRIS</h3>';
  html += '<p style="font-size:18px;font-weight:bold;">Rp ' + total.toLocaleString('id') + '</p>';
  html += '<div id="qrisCode" style="margin:12px 0;display:flex;justify-content:center;"></div>';
  html += '<button class="btn" onclick="konfirmasiQRIS()" style="background:#009688;color:white;width:100%;">✅ Konfirmasi Pembayaran</button>';
  html += '<button class="btn btn-danger" onclick="document.getElementById(\'qrisPopupModal\').remove()" style="width:100%;margin-top:8px;">Batal</button>';
  html += '</div>';
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
  
  setTimeout(function() {
    var container = document.getElementById('qrisCode');
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, { text: 'amount=' + total, width: 180, height: 180 });
    } else {
      container.innerHTML = 'QRIS: Rp ' + total.toLocaleString('id');
    }
  }, 100);
}

function konfirmasiQRIS() {
  var totalEl = document.getElementById('totalCart');
  var total = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0;
  bayarValue = total;
  updateBayarDisplay();
  var modal = document.getElementById('qrisPopupModal');
  if (modal) modal.remove();
  bayarDanCetak();
}

function simpanTunai() {
  bayarValue = parseInt(document.getElementById('inputBayarPopup').value) || 0;
  updateBayarDisplay();
  document.getElementById('popupTunaiModal').remove();
}

function tambahNominalPopup(n) { 
  var i = document.getElementById('inputBayarPopup'); 
  if (i) i.value = (parseInt(i.value) || 0) + n; 
}

function searchProductFn(query) {
  clearTimeout(searchTimer);
  var div = document.getElementById('searchResults');
  if (!div) return;
  if (!query || query.length < 2) { div.style.display = 'none'; return; }
  searchTimer = setTimeout(async function() {
    var q = query.trim();
    var result = await supabaseClient.from('products').select('*').or('nama.ilike.%' + q + '%,barcode.ilike.%' + q + '%,kategori.ilike.%' + q + '%').order('nama').limit(15);
    var data = result.data || [];
    if (!data.length) { div.innerHTML = '<div class="search-item">Tidak ditemukan</div>'; div.style.display = 'block'; return; }
    var html = '';
    data.forEach(function(p) { html += '<div class="search-item" data-barcode="' + p.barcode + '">' + (p.foto ? '<img src="' + p.foto + '" class="search-item-img">' : '📦') + '<div><strong>' + p.nama + '</strong><br><small>' + p.barcode + ' | Stok:' + p.stok + ' | Rp' + (p.harga_jual || 0).toLocaleString('id') + '</small></div></div>'; });
    div.innerHTML = html; div.style.display = 'block';
    div.querySelectorAll('.search-item[data-barcode]').forEach(function(item) { item.onclick = function() { div.style.display = 'none'; document.getElementById('searchProduct').value = ''; tambahProdukKeCart(item.dataset.barcode); }; });
  }, 300);
}

document.addEventListener('click', function(e) { var s = document.getElementById('searchProduct'), r = document.getElementById('searchResults'); if (s && r && e.target !== s && !r.contains(e.target)) r.style.display = 'none'; });

async function tambahProdukDariScan(barcode) {
  var clean = barcode.replace(/[^a-zA-Z0-9\-_]/g, ''); if (!clean) return;
  var product = await getProductByBarcode(clean);
  if (!product) { var r = await supabaseClient.from('products').select('*').or('barcode.ilike.%' + clean + '%,nama.ilike.%' + clean + '%').limit(1); product = r.data ? r.data[0] : null; }
  if (!product) { alert('Produk tidak ditemukan'); return; }
  if (product.stok <= 0) { alert('Stok habis'); return; }
  var existing = cart.find(function(i) { return i.barcode === product.barcode; });
  if (existing) {
    if (existing.qty < product.stok) { existing.qty++; existing.harga = calculateGrosirPrice(product, existing.qty); existing.isGrosir = existing.harga < existing.hargaAsli; existing.diskon = 0; }
    else { alert('Stok tidak cukup'); return; }
  } else {
    var hg = calculateGrosirPrice(product, 1);
    cart.push({ barcode: product.barcode, nama: product.nama, harga: hg, hargaAsli: product.harga_jual || 0, qty: 1, stok: product.stok, diskon: 0, isGrosir: hg < (product.harga_jual || 0) });
  }
  renderCart();
}
function tambahProdukKeCart(barcode) { tambahProdukDariScan(barcode); }

function calculateGrosirPrice(product, qty) { var hn = product.hargaAsli || product.harga_jual || 0; var dp = product.diskon_persen || 0; var mq = product.diskon_min_qty || 0; if (dp > 0 && mq > 0 && qty >= mq) { return hn - Math.round((dp / 100) * hn); } return hn; }

function editDiskonItem(index) {
  var item = cart[index];
  var d = prompt('Diskon untuk ' + item.nama + ':', item.diskon || '0');
  if (d === null) return;
  var nilai = 0;
  if (d.indexOf('%') > -1) { var persen = parseFloat(d); nilai = Math.round((persen / 100) * item.harga * item.qty); }
  else { nilai = parseInt(d) || 0; }
  item.diskon = Math.max(0, Math.min(nilai, item.harga * item.qty));
  renderCart();
}

function bukaPopupDiskonTotal() {
  var modal = document.createElement('div');
  modal.id = 'popupDiskonModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:8px;width:300px;text-align:center;"><h3>Diskon Total</h3><input type="text" id="inputDiskonPopup" placeholder="Nominal atau %" style="width:100%;padding:8px;"><div style="margin-top:10px;"><button class="btn-sm" onclick="simpanDiskonTotal()">Simpan</button><button class="btn-sm btn-danger" onclick="document.getElementById(\'popupDiskonModal\').remove()">Batal</button></div></div>';
  document.body.appendChild(modal);
}

function simpanDiskonTotal() {
  var input = document.getElementById('inputDiskonPopup').value.trim();
  var nilai = 0;
  var subtotal = cart.reduce(function(s, i) { return s + (i.harga * i.qty) - (i.diskon || 0); }, 0);
  if (input.indexOf('%') > -1) { nilai = Math.round((parseFloat(input) / 100) * subtotal); }
  else { nilai = parseInt(input) || 0; }
  totalDiskonValue = nilai;
  document.getElementById('popupDiskonModal').remove();
  renderCart();
}

function renderCart() {
  var tbody = document.querySelector('#cartTable tbody'); tbody.innerHTML = '';
  var subtotalItemNetto = 0;
  
  var showDiskonItem = typeof isDiskonItemActive === 'function' ? isDiskonItemActive() : true;
  var showDiskonTotal = typeof isDiskonTotalActive === 'function' ? isDiskonTotalActive() : true;
  
  cart.forEach(function(item, idx) {
    var sub = item.harga * item.qty; var diskon = item.diskon || 0; subtotalItemNetto += sub - diskon;
    var row = tbody.insertRow();
    var html = '<td>' + item.nama + '</td><td>' + (item.isGrosir ? '<small style="color:#e53935;">GROSIR</small><br>' : '') + 'Rp' + item.harga.toLocaleString('id') + '</td>';
    html += '<td><div class="qty-control"><button onclick="changeQty(' + idx + ',-1)">-</button><input type="number" min="1" value="' + item.qty + '" onchange="updateQty(' + idx + ',this.value)" style="width:50px;text-align:center;"><button onclick="changeQty(' + idx + ',1)">+</button></div></td>';
    html += '<td>Rp' + sub.toLocaleString('id') + (diskon > 0 ? '<br><small style="color:#e53935;">-Rp' + diskon.toLocaleString('id') + '</small>' : '') + '</td>';
    html += '<td>' + (isAdmin && showDiskonItem ? '<button class="btn-sm" onclick="editDiskonItem(' + idx + ')">💰</button>' : '') + '<button class="btn-sm" onclick="lihatDetailProduk(\'' + item.barcode + '\')">ℹ️</button><button class="btn-sm" onclick="hapusCartItem(' + idx + ')">✕</button></td>';
    row.innerHTML = html;
  });
  
  var diskonContainer = document.getElementById('diskonContainer');
  if (diskonContainer) {
    var totalSetelahDiskon = subtotalItemNetto - totalDiskonValue;
    
    var html = '<div style="text-align:right;font-size:14px;">';
    html += '<div><strong>SUBTOTAL: Rp' + subtotalItemNetto.toLocaleString('id') + '</strong></div>';
    
    if (totalDiskonValue > 0) {
      html += '<div style="color:#e53935;">Diskon: -Rp' + totalDiskonValue.toLocaleString('id') + '</div>';
    }
    
    var totalTax = 0;
    if (typeof getTaxList === 'function' && typeof taxSettings !== 'undefined') {
      var taxList = getTaxList(totalSetelahDiskon);
      taxList.forEach(function(t) {
        html += '<div style="font-size:12px;">' + t.nama + ': Rp' + Math.abs(t.jumlah).toLocaleString('id') + '</div>';
        totalTax += t.jumlah;
      });
    }
    
    var totalFinal = totalSetelahDiskon + totalTax;
    
    html += '<div style="font-size:16px;font-weight:bold;margin-top:6px;">TOTAL: Rp<span id="totalCart">' + totalFinal.toLocaleString('id') + '</span></div>';
    if (isAdmin && showDiskonTotal) html += '<button class="btn-sm" style="background:#ff9800;color:white;border:none;padding:6px 12px;border-radius:6px;margin-top:4px;" onclick="bukaPopupDiskonTotal()">💰 Diskon Total</button>';
    html += '</div>';
    diskonContainer.innerHTML = html;
  }
  hitungKembalian();
}

function changeQty(i, d) { var q = cart[i].qty + d; if (q < 1) q = 1; if (q > cart[i].stok) q = cart[i].stok; cart[i].qty = q; getProductByBarcode(cart[i].barcode).then(function(p) { if (p) { cart[i].harga = calculateGrosirPrice(p, q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; } renderCart(); }); }
function updateQty(i, q) { q = parseInt(q) || 1; if (q > cart[i].stok) q = cart[i].stok; cart[i].qty = q; getProductByBarcode(cart[i].barcode).then(function(p) { if (p) { cart[i].harga = calculateGrosirPrice(p, q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; } renderCart(); }); }
function hapusCartItem(i) { cart.splice(i, 1); renderCart(); }

function hitungKembalian() { 
  var totalEl = document.getElementById('totalCart');
  var t = 0;
  if (totalEl) {
    t = parseInt(totalEl.textContent.replace(/\D/g, '')) || 0;
  }
  var kembalianEl = document.getElementById('kembalianDisplay');
  if (kembalianEl) {
    kembalianEl.textContent = Math.max(0, bayarValue - t).toLocaleString('id');
  }
}

async function bayarDanCetak() {
  var role = currentUser ? currentUser.role : '';
  if (role !== 'admin' && role !== 'kasir') { alert('Tidak ada akses'); return; }
  if (!cart.length) { alert('Keranjang kosong'); return; }
  var cust = document.getElementById('custName').value.trim();
  
  var subtotal1 = cart.reduce(function(s, i) { return s + (i.harga * i.qty) - (i.diskon || 0); }, 0);
  var grandTotal = subtotal1 - totalDiskonValue;
  
  await loadTaxSettings();
  var taxJumlah = typeof hitungTax === 'function' ? hitungTax(grandTotal) : 0;
  var totalFinal = grandTotal + taxJumlah;
  
  if (bayarValue < totalFinal) { alert('Pembayaran kurang\nTotal: Rp ' + totalFinal.toLocaleString('id')); return; }
  var kembali = bayarValue - totalFinal;
  var now = new Date();
  var no = 'INV-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  
  try {
    for (var j = 0; j < cart.length; j++) {
      var pr = await supabaseClient.from('products').select('stok').eq('barcode', cart[j].barcode).single();
      if (pr.data) await supabaseClient.from('products').update({ stok: Math.max(0, pr.data.stok - cart[j].qty) }).eq('barcode', cart[j].barcode);
    }
    
    var trxData = {
      no_invoice: no, tanggal: now.toISOString(), customer: cust,
      items: cart.map(function(i) { return { barcode: i.barcode, nama: i.nama, harga: i.harga, qty: i.qty, diskon: i.diskon || 0 }; }),
      total: totalFinal, bayar: bayarValue, kembali: kembali,
      totalDiskon: totalDiskonValue,
      voucher_kode: currentVoucherData ? currentVoucherData.kode : null,
      tax_jumlah: taxJumlah,
      created_by: currentUser.username
    };
    
    if (typeof isOnline !== 'undefined' && isOnline) await insertTransaction(trxData);
    else if (typeof isOnline !== 'undefined' && !isOnline) await queueOfflineTransaction(trxData);
    else await insertTransaction(trxData);
    
    if (currentVoucherData) await markVoucherUsed(currentVoucherData.kode, no);
    
    var generatedVoucher = await generateVoucherKode(no, subtotal1);
    var toko = appSettings;
    var lk = parseInt(toko.kertas_lebar) || 80;
    var taxList = typeof getTaxList === 'function' ? getTaxList(grandTotal) : [];
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: [lk, 120 + cart.length * 8 + taxList.length * 5] });
    var y = 8;
    
    doc.setFontSize(9);
    doc.text(toko.nama || 'TOKO', lk / 2, y, { align: 'center' });
    y += 5;
    
    if (toko.alamat) {
      doc.setFontSize(7);
      var alamatLines = doc.splitTextToSize(toko.alamat, lk - 6);
      alamatLines.forEach(function(line) {
        doc.text(line, lk / 2, y, { align: 'center' });
        y += 4;
      });
    }
    y += 2;
    
    doc.setFontSize(7);
    doc.text('No: ' + no, 3, y); y += 4;
    doc.text('Tanggal: ' + now.toLocaleString('id-ID'), 3, y); y += 4;
    doc.text('Customer: ' + (cust || '-'), 3, y); y += 6;
    doc.line(3, y, lk - 3, y); y += 4;
    
    doc.text('Item', 3, y);
    doc.text('Qty', lk * 0.4, y, { align: 'center' });
    doc.text('Harga', lk * 0.65, y, { align: 'right' });
    doc.text('Subtotal', lk - 3, y, { align: 'right' });
    y += 4;
    
    cart.forEach(function(i) {
      var sub = i.harga * i.qty;
      var netto = sub - (i.diskon || 0);
      var namaLines = doc.splitTextToSize(i.nama, lk * 0.35);
      
      namaLines.forEach(function(line, lineIndex) {
        if (lineIndex === 0) {
          doc.text(line, 3, y);
          doc.text(i.qty.toString(), lk * 0.4, y, { align: 'center' });
          doc.text('Rp' + i.harga.toLocaleString('id'), lk * 0.65, y, { align: 'right' });
          doc.text('Rp' + netto.toLocaleString('id'), lk - 3, y, { align: 'right' });
        } else {
          doc.text(line, 3, y);
        }
        y += 4;
      });
      
      if (i.diskon > 0) {
        doc.setFontSize(6);
        doc.text('  Diskon: -Rp' + i.diskon.toLocaleString('id'), 5, y);
        doc.setFontSize(7);
        y += 4;
      }
    });
    
    doc.line(3, y, lk - 3, y); y += 4;
    
    doc.text('Subtotal:', 3, y);
    doc.text('Rp' + subtotal1.toLocaleString('id'), lk - 3, y, { align: 'right' });
    y += 5;
    
    if (totalDiskonValue > 0) {
      doc.text('Diskon:', 3, y);
      doc.text('-Rp' + totalDiskonValue.toLocaleString('id'), lk - 3, y, { align: 'right' });
      y += 5;
    }
    
    taxList.forEach(function(t) {
      doc.text(t.nama + ':', 3, y);
      doc.text('Rp' + Math.abs(t.jumlah).toLocaleString('id'), lk - 3, y, { align: 'right' });
      y += 5;
    });
    
    doc.setFontSize(9);
    doc.text('TOTAL:', 3, y);
    doc.text('Rp' + totalFinal.toLocaleString('id'), lk - 3, y, { align: 'right' });
    y += 6;
    
    doc.setFontSize(8);
    doc.text('Bayar:', 3, y);
    doc.text('Rp' + bayarValue.toLocaleString('id'), lk - 3, y, { align: 'right' });
    y += 5;
    
    doc.text('Kembali:', 3, y);
    doc.text('Rp' + kembali.toLocaleString('id'), lk - 3, y, { align: 'right' });
    y += 5;
    
    if (generatedVoucher) {
      y += 3;
      doc.setFontSize(7);
      doc.text('🎟️ SELAMAT!', lk / 2, y, { align: 'center' }); y += 4;
      doc.text('Voucher: ' + generatedVoucher.kode, lk / 2, y, { align: 'center' }); y += 4;
    }
    
    if (toko.footer) {
      y += 3;
      doc.setFontSize(7);
      var footerLines = doc.splitTextToSize(toko.footer, lk - 6);
      footerLines.forEach(function(line) {
        doc.text(line, lk / 2, y, { align: 'center' });
        y += 4;
      });
    }
    
    var pdfBlob = doc.output('blob');
    try { await uploadInvoicePDF(no, pdfBlob); } catch(e) {}
    window.open(URL.createObjectURL(pdfBlob), '_blank');
    
    tampilkanPopupShare(no, totalFinal);
    
    currentVoucherData = null;
    cart = []; totalDiskonValue = 0; bayarValue = 0;
    updateBayarDisplay(); renderCart();
    document.getElementById('custName').value = '';
  } catch(e) { alert('Gagal: ' + e.message); }
}

function lihatDetailProduk(barcode) { (async function() { var p = await getProductByBarcode(barcode); if(!p) return; alert(p.nama + '\nStok: ' + p.stok + '\nHarga: Rp' + (p.harga_jual||0).toLocaleString('id') + '\nLokasi: ' + (p.lokasi||'-')); })(); }

async function simpanPesanan() {
  if (!cart.length) { alert('Keranjang kosong'); return; }
  var cust = document.getElementById('custName').value.trim();
  var now = new Date();
  var no = 'PSN-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  var subtotal = cart.reduce(function(s, i) { return s + (i.harga * i.qty) - (i.diskon || 0); }, 0);
  await supabaseClient.from('saved_orders').insert({
    no_pesanan: no, customer: cust,
    items: cart.map(function(i) { return { barcode: i.barcode, nama: i.nama, harga: i.harga, qty: i.qty, diskon: i.diskon || 0 }; }),
    total: subtotal - totalDiskonValue, total_diskon: totalDiskonValue,
    status: 'pending', created_by: currentUser.username
  });
  alert('Pesanan disimpan: ' + no);
  cart = []; totalDiskonValue = 0; bayarValue = 0;
  updateBayarDisplay(); renderCart();
  document.getElementById('custName').value = '';
}

async function tampilkanPesananTersimpan() {
  var r = await supabaseClient.from('saved_orders').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  var orders = r.data || [];
  var listEl = document.getElementById('pesananList');
  if (!orders.length) { listEl.innerHTML = '<p>Tidak ada pesanan</p>'; }
  else {
    var html = '';
    orders.forEach(function(o) {
      html += '<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:8px;"><strong>' + o.no_pesanan + '</strong> | Rp' + (o.total||0).toLocaleString('id');
      html += '<br><button class="btn-sm" onclick="muatPesanan(\'' + o.no_pesanan + '\')">📥 Muat</button></div>';
    });
    listEl.innerHTML = html;
  }
  document.getElementById('pesananModal').style.display = 'flex';
}

async function muatPesanan(noPesanan) {
  var r = await supabaseClient.from('saved_orders').select('*').eq('no_pesanan', noPesanan).single();
  if (!r.data) { alert('Tidak ditemukan'); return; }
  var order = r.data;
  cart = [];
  order.items.forEach(function(i) { cart.push({ barcode: i.barcode, nama: i.nama, harga: i.harga, hargaAsli: i.harga, qty: i.qty, stok: 999, diskon: i.diskon || 0, isGrosir: false }); });
  totalDiskonValue = order.total_diskon || 0;
  if (order.customer) document.getElementById('custName').value = order.customer;
  currentPesananNo = noPesanan;
  renderCart();
  document.getElementById('pesananModal').style.display = 'none';
}

async function hapusPesanan(noPesanan) {
  if (!confirm('Hapus?')) return;
  await supabaseClient.from('saved_orders').delete().eq('no_pesanan', noPesanan);
  tampilkanPesananTersimpan();
}

function invalidateSettingsCache() { cachedSettings = null; }