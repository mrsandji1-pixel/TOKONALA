// ===================== FITUR SHARE (Email + WhatsApp) =====================
var lastInvoiceNo = null;

function tampilkanPopupShare(noInvoice, total) {
  var hasEmail = typeof activeFeatures !== 'undefined' && activeFeatures.emailstruk;
  var hasWhatsApp = typeof activeFeatures !== 'undefined' && activeFeatures.whatsapp;
  
  if (!hasEmail && !hasWhatsApp) {
    alert('✅ Pembayaran berhasil!\nNo: ' + noInvoice + '\nTotal: Rp ' + total.toLocaleString('id'));
    return;
  }
  
  supabaseClient.from('transactions').select('*').eq('no_invoice', noInvoice).single().then(function(r) {
    var trx = r.data;
    
    var modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    var html = '<div style="background:#fff;padding:20px;border-radius:12px;width:95%;max-width:350px;max-height:85vh;overflow-y:auto;text-align:center;">';
    html += '<h3 style="margin:0 0 8px;">✅ Pembayaran Berhasil!</h3>';
    
    if (trx) {
      html += '<div style="font-weight:bold;font-size:14px;">' + (appSettings && appSettings.nama ? appSettings.nama : 'TOKO') + '</div>';
      html += '<div style="font-size:10px;color:#666;">' + (appSettings && appSettings.alamat ? appSettings.alamat : '') + '</div>';
      html += '<hr style="border-top:1px dashed #ccc;">';
      
      html += '<div style="text-align:left;font-size:11px;">';
      html += '<div>No: ' + trx.no_invoice + '</div>';
      html += '<div>Tanggal: ' + new Date(trx.tanggal).toLocaleString('id-ID') + '</div>';
      html += '<div>Customer: ' + (trx.customer || '-') + '</div>';
      html += '<hr style="border-top:1px dashed #ccc;">';
      
      // Items
      if (trx.items) {
        trx.items.forEach(function(i) {
          var sub = i.harga * i.qty;
          var netto = sub - (i.diskon || 0);
          html += '<div style="display:flex;justify-content:space-between;">';
          html += '<span>' + i.nama + ' x' + i.qty + '</span>';
          html += '<span>Rp' + netto.toLocaleString('id') + '</span>';
          html += '</div>';
          if (i.diskon > 0) {
            html += '<div style="font-size:10px;color:#e53935;text-align:right;">Diskon: -Rp' + i.diskon.toLocaleString('id') + '</div>';
          }
        });
      }
      html += '<hr style="border-top:1px dashed #ccc;">';
      
      // Subtotal
      var subtotal = (trx.total || 0) - (trx.tax_jumlah || 0) + (trx.totalDiskon || 0);
      html += '<div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>Rp' + subtotal.toLocaleString('id') + '</span></div>';
      
      // Discount
      if (trx.totalDiskon > 0) {
        html += '<div style="display:flex;justify-content:space-between;color:#e53935;"><span>Diskon:</span><span>-Rp' + trx.totalDiskon.toLocaleString('id') + '</span></div>';
      }
      
      // Tax breakdown
      var taxList = typeof getTaxList === 'function' ? getTaxList(subtotal) : [];
      taxList.forEach(function(t) {
        html += '<div style="display:flex;justify-content:space-between;font-size:11px;"><span>' + t.nama + ':</span><span>Rp' + Math.abs(t.jumlah).toLocaleString('id') + '</span></div>';
      });
      
      // Total
      html += '<div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:4px;"><span>TOTAL:</span><span>Rp' + trx.total.toLocaleString('id') + '</span></div>';
      
      // Payment
      html += '<div style="display:flex;justify-content:space-between;"><span>Bayar:</span><span>Rp' + trx.bayar.toLocaleString('id') + '</span></div>';
      html += '<div style="display:flex;justify-content:space-between;"><span>Kembali:</span><span>Rp' + trx.kembali.toLocaleString('id') + '</span></div>';
      
      // Footer
      if (appSettings && appSettings.footer) {
        html += '<hr style="border-top:1px dashed #ccc;">';
        html += '<div style="font-size:10px;color:#666;">' + appSettings.footer + '</div>';
      }
      
      html += '</div>';
    } else {
      html += '<p>No: ' + noInvoice + '</p>';
      html += '<p style="font-size:20px;font-weight:bold;">Rp ' + total.toLocaleString('id') + '</p>';
    }
    
    // Share buttons
    html += '<div style="display:flex;gap:8px;margin-top:12px;">';
    if (hasEmail) {
      html += '<button class="btn" onclick="bagikanEmail(\'' + noInvoice + '\')" style="flex:1;background:#2196f3;color:white;">📧 Email</button>';
    }
    if (hasWhatsApp) {
      html += '<button class="btn" onclick="bagikanWhatsApp(\'' + noInvoice + '\')" style="flex:1;background:#25d366;color:white;">📱 WhatsApp</button>';
    }
    html += '</div>';
    
    html += '<button class="btn btn-danger" onclick="document.getElementById(\'shareModal\').remove()" style="margin-top:8px;width:100%;">Tutup</button>';
    html += '</div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
  });
}

function bagikanEmail(noInvoice) {
  var modal = document.getElementById('shareModal');
  if (modal) modal.remove();
  if (typeof emailStrukDariLaporan === 'function') {
    emailStrukDariLaporan(noInvoice);
  }
}

function bagikanWhatsApp(noInvoice) {
  var modal = document.getElementById('shareModal');
  if (modal) modal.remove();
  if (typeof whatsappStruk === 'function') {
    whatsappStruk(noInvoice);
  }
}