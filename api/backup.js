// ==================== BACKUP API ====================
export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ' + process.env.BACKUP_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const results = {};
    const tables = ['users', 'products', 'transactions', 'settings', 'saved_orders'];
    
    for (const table of tables) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*');
      
      if (error) throw error;
      results[table] = data;
    }

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: results
    };

    const backupJSON = JSON.stringify(backup, null, 2);
    const fileName = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    const blob = new Blob([backupJSON], { type: 'application/json' });
    const { error: uploadError } = await supabaseClient
      .storage
      .from('backups')
      .upload(fileName, blob, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const totalRows = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    await supabaseClient.from('backup_log').insert({
      backup_type: 'scheduled',
      file_name: fileName,
      file_size: backupJSON.length,
      rows_backed_up: totalRows,
      status: 'success'
    });

    return res.status(200).json({
      success: true,
      fileName,
      totalRows,
      size: (backupJSON.length / 1024).toFixed(1) + ' KB'
    });

  } catch (error) {
    await supabaseClient.from('backup_log').insert({
      backup_type: 'scheduled',
      status: 'failed',
      file_name: error.message
    });

    return res.status(500).json({ error: error.message });
  }
}