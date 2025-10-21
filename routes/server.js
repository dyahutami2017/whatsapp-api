const express = require('express');
const cors = require('cors');
let router = express.Router();
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
let { generateToken, getRefreshTokens } = require('../middleware/auth');

const bodyParser = require('body-parser')

dotenv.config();
router.use(bodyParser.json())

router.post('/token', async (req, res) => {
    let id_user = req.body.nik;
    let email = req.body.email;

    let user = {
        id_user: id_user,
        email: email
    };
    await generateToken(user, res);
});

router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    let token = getRefreshTokens();

    if (!refreshToken) {
        res.status(403).json({ error: 'Refresh token tidak valid' });
    }

    try {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                res.status(403).json({ error: 'Token kadaluarsa' });
            }
            const tokens = generateToken({ id_user: decoded.id_user, email: decoded.email }, res);
            res.status(200).json(tokens);
        });
    } catch (err) {
        console.error('Error refresh token:', err);
        // res.status(500).json({ error: err.message });
    }
});

module.exports = router;