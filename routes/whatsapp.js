// whatsapp.js
// const makeWASocket = require('@whiskeysockets/baileys').default
// const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal')
const { Boom } = require('@hapi/boom')

let sock // koneksi global
let isConnected = false

async function connectWhatsApp() {
  // Folder 'session' menyimpan data login agar tidak perlu scan ulang
  const { state, saveCreds } = await useMultiFileAuthState('session')
  
  sock = makeWASocket({
    version: [2, 3000, 1027934701], //perlu ditambahkan ini karena jika tidak whatsapp akan menolak
    auth: state,
    browser: ['MyApp', 'Chrome', '1.0.0'], // nama bebas
    syncFullHistory: true,
  })

  // Simpan kredensial setiap kali diperbarui
  sock.ev.on('creds.update', saveCreds)

  // Tangani perubahan koneksi
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    // ✅ Jika Baileys memberikan QR code, cetak di terminal
    if (qr) {
      console.log('📱 Scan QR berikut untuk login WhatsApp:')
      // qrcode.generate(qr, { small: true })
      qrcode.generate(qr, { small: true }, (qrcode) => {
        console.log(qrcode)
      })
    }

    // Log status koneksi
    if (connection === 'connecting') {
      console.log('⏳ Menghubungkan ke WhatsApp...')
    } else if (connection === 'open') {
      isConnected = true
      console.log('✅ WhatsApp Connected!')
    } else if (connection === 'close') {
        isConnected = false
        const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        const reason = new Boom(lastDisconnect?.error).output.statusCode
        console.log('❌ Koneksi tertutup. Reconnect:', reason)
        if (shouldReconnect) connectWhatsApp()
        else console.log('🛑 Silakan hapus folder session dan scan ulang QR.')
    }
  })
}



// kirim pesan ke nomor tertentu
async function sendMessage(number, message) {
  if (!sock) throw new Error('WhatsApp belum terkoneksi.')
  const jid = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
  await sock.sendMessage(jid, { text: message })
  return { to: number, message }
}

function getSocket() {
  try {
    if (!sock) throw new Error('WhatsApp belum terkoneksi.')
    return sock
  } catch (err) {
    throw err
  }
}

function isWhatsAppConnected() {
  return { connected: isConnected, ready: !!sock, user: sock?.user || null }
}

module.exports = { connectWhatsApp, sendMessage, getSocket, isWhatsAppConnected };