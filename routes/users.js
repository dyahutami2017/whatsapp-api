var express = require('express');
var router = express.Router();
var oracledb = require('oracledb');
var dbConfig = require('../db');
let { authenticateToken } = require('../middleware/auth');

/* GET users listing. */
router.get('/', authenticateToken, async function(req, res, next) {
  let connection;

  try {
    connection = await dbConfig.init();

    const result = await connection.execute(
      `SELECT NIK, NAMA,EMAIL, KARY_TYPE FROM V_KARYAWAN KAR 
        LEFT JOIN V_EMAIL_KAR EMAIL USING(NIK) 
        WHERE KAR.BAGIAN = 15 AND KAR.STATUS = 'A'`,
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
