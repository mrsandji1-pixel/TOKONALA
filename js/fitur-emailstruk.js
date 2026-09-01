// ===================== FITUR EMAIL STRUK =====================
async function setupEmailStruk() {
  await muatDaftarEmailStruk();
}

async function emailStrukDariLaporan(noInvoice) {
  var email = prompt('📧 Email tujuan:');
  if (!email) return;
  await kirimEmailStruk(noInvoice, email);
}

async function muatDaftarEmailStruk() {
  var container = document.getElementById('emailStrukContent');
  if (!container) return;
  
  var trx = await supabaseClient.from('transactions').select('*').order('tanggal', { ascending: false }).limit(20);
  var transactions = trx.data || [];
  
  var html = '<h4>📋 Transaksi Terbaru</h4>';
  
  if (!transactions.length) {
    html += '<p>Tidak ada transaksi</p>';
    container.innerHTML = html;
    return;
  }
  
  html += '<table class="user-table"><thead><tr><th>Invoice</th><th>Total</th><th>Aksi</th></tr></thead><tbody>';
  transactions.forEach(function(t) {
    html += '<tr><td>' + t.no_invoice + '</td><td>Rp ' + (t.total||0).toLocaleString('id') + '</td>';
    html += '<td><button class="btn-sm" onclick="emailStrukDariLaporan(\'' + t.no_invoice + '\')">📧</button></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function kirimEmailStruk(noInvoice, emailTujuan) {
  var trx = await supabaseClient.from('transactions').select('*').eq('no_invoice', noInvoice).single();
  
  if (!trx.data) {
    alert('Transaksi tidak ditemukan');
    return;
  }
  
  var t = trx.data;
  
  var message = '🧾 STRUK PEMBELIAN\n';
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += (appSettings && appSettings.nama ? appSettings.nama : 'TOKO') + '\n';
  if (appSettings && appSettings.alamat) {
    message += appSettings.alamat + '\n';
  }
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += 'No: ' + t.no_invoice + '\n';
  message += 'Tanggal: ' + new Date(t.tanggal).toLocaleString('id-ID') + '\n';
  message += 'Customer: ' + (t.customer || '-') + '\n';
  message += '━━━━━━━━━━━━━━━━━━\n';
  
  if (t.items) {
    t.items.forEach(function(i) {
      var sub = i.harga * i.qty;
      var netto = sub - (i.diskon || 0);
      message += i.nama + ' x' + i.qty + ' = Rp ' + netto.toLocaleString('id') + '\n';
      if (i.diskon > 0) {
        message += '  Diskon: -Rp ' + i.diskon.toLocaleString('id') + '\n';
      }
    });
  }
  
  message += '━━━━━━━━━━━━━━━━━━\n';
  
  var subtotal = (t.total || 0) - (t.tax_jumlah || 0) + (t.totalDiskon || 0);
  message += 'Subtotal: Rp ' + subtotal.toLocaleString('id') + '\n';
  
  if (t.totalDiskon > 0) {
    message += 'Diskon: -Rp ' + t.totalDiskon.toLocaleString('id') + '\n';
  }
  
  var taxList = typeof getTaxList === 'function' ? getTaxList(subtotal) : [];
  taxList.forEach(function(tax) {
    message += tax.nama + ': Rp ' + Math.abs(tax.jumlah).toLocaleString('id') + '\n';
  });
  
  message += '━━━━━━━━━━━━━━━━━━\n';
  message += 'TOTAL: Rp ' + t.total.toLocaleString('id') + '\n';
  message += 'Bayar: Rp ' + t.bayar.toLocaleString('id') + '\n';
  message += 'Kembali: Rp ' + t.kembali.toLocaleString('id') + '\n';
  
  if (appSettings && appSettings.footer) {
    message += '━━━━━━━━━━━━━━━━━━\n';
    message += appSettings.footer + '\n';
  }
  
  message += '━━━━━━━━━━━━━━━━━━\n';
  
  try {
    if (typeof sendEmailResend === 'function') {
      await sendEmailResend(emailTujuan, '🧾 Struk ' + noInvoice, message);
    }
    
    await supabaseClient.from('email_struk_log').insert({
      no_invoice: noInvoice,
      email_tujuan: emailTujuan,
      status: 'sent'
    });
    
    alert('✅ Struk dikirim ke ' + emailTujuan);
    muatDaftarEmailStruk();
  } catch(e) {
    alert('❌ Gagal kirim: ' + e.message);
  }
}