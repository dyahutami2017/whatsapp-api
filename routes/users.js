var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var dbConfig = require('../db');

/* GET users listing. */
router.get('/', async function(req, res, next) {
  let connection;

  try {
    connection = await dbConfig.init();

    const result = await connection.execute(
      `SELECT * FROM V_KARYAWAN WHERE BAGIAN = 15 AND STATUS = 'A'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Mengembalikan hasil sebagai objek
    );

    res.json([
      { 
        status: 'success',
        message: 'Data karyawan berhasil diambil',
        data: result.rows
       }
    ]).status(200);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  } 
});


module.exports = router;
