// ===================== SUPABASE CONFIG (PRODUCTION) =====================
var SUPABASE_URL = 'https://ikahekmyqvdugiljcrlp.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_GjCb5njeiL6W8_HKA-OrLQ_e8dk7IIL';

var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    }
  }
});

var currentUser = null;
var workingDirHandle = null;
window.logoTokoDihapus = false;
window.cachedSettings = null;

// ---- DATABASE FUNCTIONS ----
async function getSettings() {
  var result = await supabaseClient.from('settings').select('*').eq('id', 1).single();
  return result.data || {};
}

async function updateSettings(s) {
  await supabaseClient.from('settings').upsert({ id: 1, ...s });
}

async function getAllProducts() {
  var result = await supabaseClient.from('products').select('*').order('nama');
  return result.data || [];
}

async function getProductByBarcode(barcode) {
  var result = await supabaseClient.from('products').select('*').eq('barcode', barcode).single();
  return result.data || null;
}

async function upsertProduct(p) {
  // Perbaikan: tambahkan onConflict agar update jika barcode sudah ada
  var result = await supabaseClient.from('products').upsert(p, { onConflict: 'barcode' });
  if (result.error) throw result.error;
}

async function deleteProduct(barcode) {
  var result = await supabaseClient.from('products').delete().eq('barcode', barcode);
  if (result.error) throw result.error;
}

async function getAllTransactions(start, end) {
  var q = supabaseClient.from('transactions').select('*').order('tanggal', { ascending: false });
  if (start) q = q.gte('tanggal', start);
  if (end) {
    var e = new Date(end);
    e.setDate(e.getDate() + 1);
    q = q.lt('tanggal', e.toISOString());
  }
  var result = await q;
  return result.data || [];
}

async function getTransaction(noInv) {
  var result = await supabaseClient.from('transactions').select('*').eq('no_invoice', noInv).single();
  return result.data || null;
}

async function insertTransaction(trx) {
  var result = await supabaseClient.from('transactions').insert(trx);
  if (result.error) throw result.error;
}

async function deleteTransaction(noInv) {
  var result = await supabaseClient.from('transactions').delete().eq('no_invoice', noInv);
  if (result.error) throw result.error;
}

async function uploadInvoicePDF(no, blob) {
  await supabaseClient.storage.from('invoices').upload(no + '.pdf', blob, { 
    contentType: 'application/pdf', 
    upsert: true 
  });
}

async function getInvoiceURL(no) {
  var result = supabaseClient.storage.from('invoices').getPublicUrl(no + '.pdf');
  return result.data ? result.data.publicUrl : null;
}

function toBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function invalidateSettingsCache() {
  window.cachedSettings = null;
  if (typeof appSettings !== 'undefined') { appSettings = {}; }
}