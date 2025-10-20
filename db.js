const oracledb = require('oracledb');

oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_23_9' });

async function init() {
  try {
    // Konfigurasi database
    const connection = await oracledb.getConnection({
      user: 'dyah',               // username Oracle
      password: 'dy4h#und1ka',// password Oracle
      connectString: '10.10.10.23:1521/ora2k' // format: host[:port][/service_name]
    });

    console.log('✅ Berhasil terhubung ke Database');
    return connection;

  } catch (err) {
    console.error('❌ Gagal konek ke Database:', err);
    throw err;
  }
}

module.exports = { init };