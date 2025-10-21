const express = require('express');
const cors = require('cors');
let router = express.Router();
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

let refreshTokens = [];

async function generateToken(user, res) {
    try {
        let id_user = user.id_user
        let email = user.email;

        if (!id_user || !email) {
            return res.status(400).json({ error: 'id_user dan email wajib diisi' });
        }

        const accessToken = jwt.sign(
            { id_user, email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_LIFE }
        );
        const refreshToken = jwt.sign(
            { id_user, email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_LIFE }
        );
        refreshTokens.push(refreshToken);

        res.status(200).json({
            accessToken,
            refreshToken
        });
    } catch (err) {
        console.error('Error generate token:', err);
        res.status(500).json({ error: err.message });
    }
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({message : 'token not found'});

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => { 
        if (err) return res.status(403).json({message : 'invalid token'});
        req.user = user;
        next();
    });
}

function getRefreshTokens() {
    return refreshTokens;
}
module.exports = {  generateToken, authenticateToken, getRefreshTokens };