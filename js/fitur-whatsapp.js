// ===================== FITUR WHATSAPP =====================
async function whatsappStruk(noInvoice) {
  console.log('WhatsApp struk for:', noInvoice);
  
  var result = await supabaseClient.from('transactions').select('*').eq('no_invoice', noInvoice).single();
  
  if (result.error || !result.data) {
    alert('❌ Transaksi tidak ditemukan');
    return;
  }
  
  var t = result.data;
  console.log('Transaction found:', t.no_invoice);
  
  var message = '🧾 *STRUK PEMBELIAN*\n';
  message += 'No: ' + t.no_invoice + '\n';
  message += 'Tanggal: ' + new Date(t.tanggal).toLocaleString('id-ID') + '\n';
  message += 'Customer: ' + (t.customer || '-') + '\n\n';
  
  if (t.items) {
    t.items.forEach(function(i) {
      message += i.nama + ' x' + i.qty + ' = Rp ' + (i.harga * i.qty).toLocaleString('id') + '\n';
    });
  }
  
  message += '\n*Total: Rp ' + (t.total || 0).toLocaleString('id') + '*\n';
  message += 'Bayar: Rp ' + (t.bayar || 0).toLocaleString('id') + '\n';
  message += 'Kembali: Rp ' + (t.kembali || 0).toLocaleString('id');
  
  console.log('Showing prompt...');
  var phone = prompt('📱 Nomor WhatsApp tujuan (08xxx):');
  console.log('Phone entered:', phone);
  
  if (!phone) return;
  
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  }
  
  var waUrl = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  console.log('Opening:', waUrl);
  window.open(waUrl, '_blank');
}