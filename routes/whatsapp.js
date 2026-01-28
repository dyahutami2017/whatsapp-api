// whatsapp.js
// const makeWASocket = require('@whiskeysockets/baileys').default
// const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal')
const { Boom } = require('@hapi/boom');
const { default: axios } = require('axios');
const fs = require('fs');
const userState = {};

let sock // koneksi global
let isConnected = false

async function connectWhatsApp() {
  // Folder 'session' menyimpan data login agar tidak perlu scan ulang
  const { state, saveCreds } = await useMultiFileAuthState('session')
  
  sock = makeWASocket({
    version: [2, 3000, 1027934701], //perlu ditambahkan ini karena jika tidak whatsapp akan menolak
    // version: [2, 2204, 13],
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
      // console.log('⏳ Menghubungkan ke WhatsApp...')
    } else if (connection === 'open') {
      isConnected = true
      // console.log('✅ WhatsApp Connected!')
    } else if (connection === 'close') {
        isConnected = false
        const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        const reason = new Boom(lastDisconnect?.error).output.statusCode
        // console.log('❌ Koneksi tertutup. Reconnect:', reason)
        if (shouldReconnect) connectWhatsApp()
        else console.log('🛑 Silakan hapus folder session dan scan ulang QR.')
    }
  })

  // =============================
  // 🔥 LISTENER PESAN MASUK
  // =============================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // Ambil teks pesan
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      '';

    const stateUser = userState[from];
    // console.log(msg);
    function isKeluhan(text) {
      const requiredFields = [
        /Nama\s*:/i,
        /NIK\s*:/i,
        /Nama Aplikasi\s*:/i,
        /Keluhan\s*:/i,
        /Jenis Keluhan\s*:/i
      ];

      return requiredFields.every(regex => regex.test(text));
    }

    function isPermintaanData(text) {
      const requiredFields = [
        /Nama\s*:/i,
        /NIK\s*:/i,
        /Perihal\s*:/i,
        /Penjelasan dan Tujuan\s*:/i
      ];

      return requiredFields.every(regex => regex.test(text));
    }
    

    function parseKeluhan(text, wa_number) {
      let jenis_keluhan = text.match(/Jenis Keluhan\s*:\s*([^\n\r]+)/i)?.[1]?.trim();
      let jns_keluhan = jenis_keluhan ? jenis_keluhan.toLowerCase() : null;
      
      return {
        nama: text.match(/Nama\s*:\s*(.+)/i)?.[1]?.trim(),
        nik: text.match(/NIK\s*:\s*(.+)/i)?.[1]?.trim(),
        lokasi: text.match(/Nama Aplikasi\s*:\s*(.+)/i)?.[1]?.trim(),
        keluhan: text.match(/Keluhan\s*:[ \t]*([^\n\r]+)/i)?.[1]?.trim(),
        jenis_keluhan: jns_keluhan,
        wa_number: wa_number,
        type: 'keluhan'
      };
    }

    function parsePermintaanData(text, wa_number) {
      return {
        nama: text.match(/Nama\s*:\s*(.+)/i)?.[1]?.trim(),
        nik: text.match(/NIK\s*:\s*(.+)/i)?.[1]?.trim(),
        perihal: text.match(/Perihal\s*:\s*(.+)/i)?.[1]?.trim(),
        penjelasan_dan_tujuan: text.match(/Penjelasan dan Tujuan\s*:\s*(.+)/i)?.[1]?.trim(),
        wa_number: wa_number,
        type: 'permintaan_data'
      };
    }

    function isExpired(stateuser) {
      return !stateuser || Date.now() > stateuser.expiredAt;
    }

    // =============================
    // STATE EXPIRED
    // =============================
    if (stateUser && isExpired(stateUser)) {
      delete userState[from];

      await sock.sendMessage(from, {
        text: '⏰ Waktu input habis. Silakan mulai kembali.'
      });
    }
    // =============================
    // STATE BELUM ADA → TAMPILKAN MENU
    // =============================
    if (!userState[from]) {
      userState[from] = {
        step: 'MENU',
        expiredAt: Date.now() + 1 * 60 * 1000 // sesi berakhir dalam 10 menit
      };

      await sock.sendMessage(from, {
      text: `Hai 👋 dengan starBot untuk mencatat keluhan dan permintaan data\n*Untuk saat ini masih dalam tahapan TESTING dan hanya mencatat Keluhan dan Permintaan Data, untuk Permintaan Sistem dan Perubahan Sistem tetap melalui LASURTI*
Silakan pilih layanan (balas dengan ANGKA saja):
1. Keluhan
2. Permintaan Data`
      });
      return;
    } 

    // =============================
    // STATE MENU
    // =============================
    if (userState[from].step === 'MENU') {
      if (text === '1') {
        userState[from] = {
          step: 'KELUHAN',
          expiredAt: Date.now() + 10 * 60 * 1000 // sesi berakhir dalam 10 menit
        };

        await sock.sendMessage(from, {
          text: `Silakan tulis isian di bawah ini *YANG DIKIRIM HANYA FORMAT BERIKUT*:
Nama:
NIK:
Nama Aplikasi:
Keluhan:
Jenis Keluhan: Aplikasi/Jaringan (Pilih salah satu)`
        });
        return;
      }

      if (text === '2') {
        userState[from] = {
          step: 'PERMINTAAN_DATA',
          expiredAt: Date.now() + 10 * 60 * 1000 // sesi berakhir dalam 10 menit
        };

        await sock.sendMessage(from, {
          text: `Silakan tulis isian di bawah ini *YANG DIKIRIM HANYA FORMAT BERIKUT*:
Nama:
NIK:
Perihal:
Penjelasan dan Tujuan:`
        });
        return;
      }

      await sock.sendMessage(from, {
        text: 'Mohon balas dengan angka 1 atau 2 saja.'
      });
      return;
    }

    // =============================
    // STATE KELUHAN
    // =============================
    if (userState[from].step === 'KELUHAN') {
      //jika format keluhan tidak sesuai
      if (!isKeluhan(text)) {
        let reply = 'Format keluhan belum lengkap dan pastikan semua data terisi\n\n';
        reply += 'Format yang benar:\n';
        reply += 'Nama:\nNIK:\nNama Aplikasi:\nKeluhan:\nJenis Keluhan: Aplikasi/Jaringan (Pilih salah satu)';

        await sock.sendMessage(from, {
          text: reply
        });
        return;
      } else if (isKeluhan(text)) { //jika format sudah sesuai tapi ada data yang kosong
        const data = parseKeluhan(text, from);
        const isValid = data.nama && data.nik && data.lokasi && data.keluhan && data.jenis_keluhan;
        console.log({
          'nama': data.nama,
          'nik': data.nik,
          'lokasi': data.lokasi,
          'keluhan': data.keluhan,
          'jenis_keluhan': data.jenis_keluhan
        });
        if (!isValid) {
          await sock.sendMessage(from, {
            text: 'Mohon periksa kembali isian Anda, pastikan semua data terisi dengan benar.'
          });
          return;
        } else if(data.jenis_keluhan !== 'aplikasi' && data.jenis_keluhan !== 'jaringan') {
          await sock.sendMessage(from, {
            text: 'Jenis Keluhan harus diisi dengan "Aplikasi" atau "Jaringan". Mohon periksa kembali isian Anda.'
          });
          return;
        }
        userState[from] = null; // reset state

        let reply = 'Terima kasih atas keluhan Anda. Berikut data yang kami terima:\n\n';
        reply += `Nama: ${data.nama}\n`;
        reply += `NIK: ${data.nik}\n`;
        reply += `Nama Aplikasi: ${data.lokasi}\n`;
        reply += `Keluhan: ${data.keluhan}\n`;
        reply += `Jenis Keluhan: ${data.jenis_keluhan}\n\n`;
        reply += 'Tim kami akan segera menindaklanjuti keluhan Anda. Mohon selalu pantau di Lasurti.';

        await axios.post('https://showy-cataleya-pollable.ngrok-free.dev/webhook/store_lasurti', data)
        .then(response => {
          sock.sendMessage(from, { text: reply });
          sock.sendMessage(from, {
              video: fs.readFileSync('./public/thankyou.mp4'),
              caption: 'Sudah kami catat keluhan Anda',
              gifPlayback: true
          });
          console.log('Data keluhan berhasil dikirim ke server:', response.data);
        })
        .catch(error => {
          sock.sendMessage(from, { text: 'Maaf, terjadi kesalahan saat mengirim keluhan Anda. Silakan coba lagi nanti.' });
          console.error('Gagal mengirim data keluhan ke server:', error);
        });
        return;
      }
    }

    // =============================
    // STATE PERMINTAAN DATA
    // =============================
    if (userState[from].step === 'PERMINTAAN_DATA') {
      const permintaanData = parsePermintaanData(text, from);
      const isValidPermintaanData = permintaanData.nama && permintaanData.nik && permintaanData.perihal && permintaanData.penjelasan_dan_tujuan;
      if (!isPermintaanData(text)) {
        let reply = 'Format permintaan data belum lengkap dan pastikan semua isian terisi\n\n';
        reply += 'Format yang benar:\n';
        reply += 'Nama:\nNIK:\nPerihal:\nPenjelasan dan Tujuan:';

        await sock.sendMessage(from, {
          text: reply
        });
        return;
      } else if (isPermintaanData(text) && !isValidPermintaanData) { //jika format sudah sesuai tapi ada data yang kosong
        await sock.sendMessage(from, {
          text: 'Mohon periksa kembali isian Anda, pastikan semua data terisi dengan benar.'
        });
        return;
      }

      userState[from] = null;

      let reply = 'Terima kasih atas permintaan data yang Anda ajukan. Berikut data yang kami terima:\n\n';
      reply += `Nama: ${permintaanData.nama}\n`;
      reply += `NIK: ${permintaanData.nik}\n`;
      reply += `Perihal: ${permintaanData.perihal}\n`;
      reply += `Penjelasan dan Tujuan: ${permintaanData.penjelasan_dan_tujuan}\n\n`;
      reply += 'Tim kami akan segera menindaklanjuti permintaan Anda. Mohon selalu pantau di Lasurti.';

      await axios.post('https://showy-cataleya-pollable.ngrok-free.dev/webhook/store_lasurti', permintaanData)
      .then(response => {
        sock.sendMessage(from, { text: reply });
        sock.sendMessage(from, {
            video: fs.readFileSync('./public/permintaan_data.mp4'),
            caption: 'Sudah kami terima permintaan Anda',
            gifPlayback: true
        });
        console.log('Data keluhan berhasil dikirim ke server:', response.data);
      })
      .catch(error => {
        sock.sendMessage(from, { text: 'Maaf, terjadi kesalahan saat mengirim keluhan Anda. Silakan coba lagi nanti.' });
        console.error('Gagal mengirim data keluhan ke server:', error);
      });
      return;
    }
  });
}



// kirim pesan ke nomor tertentu
async function sendMessage(number, message) {
  if (!sock) {
    await connectWhatsApp()
  }
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

connectWhatsApp() // otomatis konek saat module diimport

module.exports = { connectWhatsApp, sendMessage, getSocket, isWhatsAppConnected };