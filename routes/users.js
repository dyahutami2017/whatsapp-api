var express = require('express');
var router = express.Router();
let { authenticateToken } = require('../middleware/auth');

/* GET users listing. */
router.get('/', async function(req, res, next) {
  res.json({ message: 'Users route is working!' });
});

router.get('/profile', async function(req, res, next) {
  res.json({ message: 'User profile accessed successfully!' });
});

module.exports = router;
