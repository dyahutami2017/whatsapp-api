const express = require('express');
let router = express.Router();
const bodyParser = require('body-parser')
const { connectWhatsApp, getSocket, isWhatsAppConnected } = require('./whatsapp')
let { authenticateToken } = require('../middleware/auth');

router.use(bodyParser.json())

router.get('/connect', authenticateToken, async (req, res) => {
  try {
    await connectWhatsApp()
    res.status(200).json({ success: true, message: 'WhatsApp terkoneksi' })
  } catch (err) {
    console.error('Error koneksi WhatsApp:', err)
    res.status(500).json({ error: err.message })
  }
})
// Endpoint kirim pesan
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { number, message } = req.body

    if (!number || !message)
      return res.status(400).json({ error: 'number dan message wajib diisi' })

    const sock = getSocket()
    const jid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    await sock.sendMessage(jid, { text: message })

    res.json({ success: true, to: number, message })
  } catch (err) {
    console.error('Error kirim pesan:', err)
    res.status(500).json({ error: err.message })
  }
})


module.exports = router;