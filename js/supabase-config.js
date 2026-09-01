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
  try {
    var result = await supabaseClient.from('settings').select('*').eq('id', 1).single();
    return result.data || {};
  } catch(e) {
    return {};
  }
}

async function updateSettings(s) {
  try {
    await supabaseClient.from('settings').upsert({ id: 1, ...s });
  } catch(e) {
    console.error('updateSettings error:', e);
  }
}

async function getAllProducts() {
  try {
    var result = await supabaseClient.from('products').select('*').order('nama');
    return result.data || [];
  } catch(e) {
    return [];
  }
}

async function getProductByBarcode(barcode) {
  try {
    if (!barcode) return null;
    var result = await supabaseClient.from('products').select('*').eq('barcode', barcode).single();
    return result.data || null;
  } catch(e) {
    return null;
  }
}

async function upsertProduct(p) {
  try {
    // Cek apakah produk sudah ada
    var existing = await supabaseClient.from('products').select('barcode').eq('barcode', p.barcode).single();
    
    if (existing.data) {
      // Update - exclude barcode dari update
      var updateData = { ...p };
      delete updateData.barcode;
      var result = await supabaseClient.from('products').update(updateData).eq('barcode', p.barcode);
      if (result.error) throw result.error;
      return result.data;
    } else {
      // Insert
      var result = await supabaseClient.from('products').insert(p);
      if (result.error) throw result.error;
      return result.data;
    }
  } catch(e) {
    console.error('upsertProduct error:', e);
    throw e;
  }
}

async function deleteProduct(barcode) {
  try {
    var result = await supabaseClient.from('products').delete().eq('barcode', barcode);
    if (result.error) throw result.error;
  } catch(e) {
    console.error('deleteProduct error:', e);
    throw e;
  }
}

async function getAllTransactions(start, end) {
  try {
    var q = supabaseClient.from('transactions').select('*').order('tanggal', { ascending: false });
    if (start) q = q.gte('tanggal', start);
    if (end) {
      var e = new Date(end);
      e.setDate(e.getDate() + 1);
      q = q.lt('tanggal', e.toISOString());
    }
    var result = await q;
    return result.data || [];
  } catch(e) {
    return [];
  }
}

async function getTransaction(noInv) {
  try {
    var result = await supabaseClient.from('transactions').select('*').eq('no_invoice', noInv).single();
    return result.data || null;
  } catch(e) {
    return null;
  }
}

async function insertTransaction(trx) {
  try {
    var result = await supabaseClient.from('transactions').insert(trx);
    if (result.error) throw result.error;
    return result.data;
  } catch(e) {
    console.error('insertTransaction error:', e);
    throw e;
  }
}

async function deleteTransaction(noInv) {
  try {
    var result = await supabaseClient.from('transactions').delete().eq('no_invoice', noInv);
    if (result.error) throw result.error;
  } catch(e) {
    console.error('deleteTransaction error:', e);
    throw e;
  }
}

async function uploadInvoicePDF(no, blob) {
  try {
    await supabaseClient.storage.from('invoices').upload(no + '.pdf', blob, { 
      contentType: 'application/pdf', 
      upsert: true 
    });
  } catch(e) {
    console.error('uploadInvoicePDF error:', e);
  }
}

async function getInvoiceURL(no) {
  try {
    var result = supabaseClient.storage.from('invoices').getPublicUrl(no + '.pdf');
    return result.data ? result.data.publicUrl : null;
  } catch(e) {
    return null;
  }
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