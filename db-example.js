const oracledb = require('oracledb');

oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_23_9' });

async function init() {
  try {
    // Konfigurasi database
    const connection = await oracledb.getConnection({
      user: '',                 // username Oracle
      password: '',             // password Oracle
      connectString: ''         // format: host[:port][/service_name]
    });

    console.log('✅ Berhasil terhubung ke Database');
    return connection;

  } catch (err) {
    console.error('❌ Gagal konek ke Database:', err);
    throw err;
  }
}

module.exports = { init };