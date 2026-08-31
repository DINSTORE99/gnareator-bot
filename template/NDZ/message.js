const axios = require("axios")
const chalk = require("chalk")
const fs = require("fs")
const path = require("path")
const util = require("util")
const os = require("os")
const FormData = require("form-data")

const API = "https://payment.vpnnexus.biz.id";
const API_KEY = "";
const indown = require("./lib/indown")
const convertYML = require("./lib/ymlConverter")

const { exec, spawn, execSync } = require('child_process');
const { prepareWAMessageMedia, generateWAMessageFromContent,
downloadMediaMessage,
downloadContentFromMessage,   
jidNormalizedUser, 
areJidsSameUser } = require("baileys");
const { uploadImageBuffer, CatBox } = require("./lib/skrep.js")
const fakeQuoted = require("./lib/fakequoted.js")
global.db = global.db ? global.db : JSON.parse(fs.readFileSync("./collection/database.json"))

const RefreshDb = async (dt) => {
global.db = dt
await fs.writeFileSync("./collection/database.json", JSON.stringify(global.db, null, 2))
}

async function getSaldo() {
  try {
    const res = await axios.get(`${API}/api/saldo`, {
      params: { apikey: API_KEY }
    });

    return Number(res.data?.data?.saldo || 0);
  } catch {
    return 0;
  }
}
//==================================//

module.exports = async (sock, m) => {
  try {

    // ===============================
    // 🔥 FIX INTERACTIVE RESPONSE
    // ===============================
    // ===============================
// INTERACTIVE HANDLER (FINAL CLEAN)
// ===============================
if (m.message?.interactiveResponseMessage) {
  try {
    const res = JSON.parse(
      m.message.interactiveResponseMessage
        .nativeFlowResponseMessage
        .paramsJson
    )

    // hasil klik menu → jadi text biasa
    m.text = res.id.toLowerCase().trim()
    m.body = m.text
  } catch (e) {
    console.log("interactive error:", e)
  }
}
    // ===============================
// ===== ANTI CRASH INIT (WAJIB) =====
if (!global.db) global.db = {}

if (!Array.isArray(global.owner)) global.owner = []

if (!Array.isArray(global.db.bljpm)) global.db.bljpm = []
if (!Array.isArray(global.db.antlink)) global.db.antlink = []
if (!Array.isArray(global.db.antilink)) global.db.antilink = []

if (!global.db.autopromo) {
  global.db.autopromo = {
    on: false,
    text: "",
    image: null,
    interval: 6 * 60 * 60 * 1000,
    lastRun: 0
  }
}

    // ===============================
    const prefix = "."
const isCmd = m.body?.startsWith(prefix)

let args = isCmd ? m.body.slice(1).trim().split(/ +/) : []
let command = args.shift()?.toLowerCase() || ""
let text = args.join(" ")

    // ===============================

const cmd = isCmd ? m.prefix + command : command

const isOwner = global.owner.includes(m.sender.split("@")[0]) || m.sender == botNumber

  m.isGroup = m.chat.endsWith('g.us');
  m.metadata = {};
  m.isAdmin = false;
  m.isBotAdmin = false;
  if (m.isGroup) {
    let meta = await global.groupMetadataCache.get(m.chat)
    if (!meta) meta = await sock.groupMetadata(m.chat).catch(_ => {})
    m.metadata = meta;
    const p = meta?.participants || [];
    m.isAdmin = p?.some(i => (i.id === m.sender || i.jid === m.sender) && i.admin !== null);
    m.isBotAdmin = p?.some(i => (i.id === botNumber || i.jid == botNumber) && i.admin !== null);
  } 
  
//==================================//

if (isCmd) {
console.log(chalk.white("• Pengirim  :"), chalk.blue(m.chat) + "\n" + chalk.white("• Grup :"), chalk.blue(m.isGroup ? m.metadata.subject : "false") + "\n" + chalk.white("• Pesan :"), chalk.blue(cmd) + "\n")
}

//==================================//

if (db.antilink.includes(m.chat)) {
    try {
    const textMessage = m.text || ""
    const groupInviteLinkRegex = /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+(\?[^\s]*)?/gi
    const links = textMessage.match(groupInviteLinkRegex)
    if (links && !isOwner && !m.isAdmin && m.isBotAdmin) {
        const messageId = m.key.id
        const participantToDelete = m.key.participant || m.sender
        await sock.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: messageId,
                participant: participantToDelete
            }
        })
    }
    } catch (er) {}
}

//==================================//

if (db.autopromosi?.status && m.isGroup && !isOwner) {
    try {
    await sleep(4000)
    const promoText = db.autopromosi?.text || ""
    const promoImage = db.autopromosi?.image || ""
    if (promoImage) {
        await sock.sendMessage(m.chat, {
            image: promoImage,
            caption: promoText
        })
    } 
    else if (promoText) {
        await sock.sendMessage(m.chat, { text: promoText })
    }
    } catch (er) {}
}

//==================================//

if (db.list && db.list[m?.text?.toLowerCase()]) {
    const data = db.list[m.text.toLowerCase()]
    const respon = data.response || ""
    if (data.image) {
        return sock.sendMessage(m.chat, { 
            image: { url: data.image }, 
            caption: respon 
        }, { quoted: m })
    } else {
        return m.reply(respon)
    }
}
 //==================================//
// AUTOJOIN: otomatis join ketika ada link grup
if (db.autojoin) {
    try {
        const textMessage = m.text || "";
        const regex = /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/([A-Za-z0-9]+)/gi;
        const detected = textMessage.match(regex);

        if (detected) {
            const invite = detected[0].split("chat.whatsapp.com/")[1];

            try {
                const result = await sock.groupAcceptInvite(invite);
                await m.reply(`📥 Berhasil masuk ke grup!\nID: ${result}`);
            } catch (error) {
                console.error("AutoJoin Error:", error);
                m.reply("⚠️ Gagal join grup. Link mungkin invalid atau bot dibatasi.");
            }
        }
    } catch (e) {
        console.error("AutoJoin Handler Error:", e);
    }
}
//==================================//
// AUTO REPLY PRIVATE CHAT (ANTI SPAM + SKIP OWNER)
if (db.autoreply?.status && !m.isGroup) {
    try {
        // Jangan balas command
        if (isCmd) return;

        // Jangan balas pesan bot sendiri
        if (m.sender === botNumber) return;

        // Jangan balas owner
        if (m.sender.split("@")[0] === global.owner) return;

        // Cegah spam: hanya balas jika pesan bukan kosong
        if (!m.text || m.text.length < 1) return;

        // Cegah spam: hanya balas 1x per chat dalam 3 detik
        global.lastReply = global.lastReply || {};
        const now = Date.now();

        if (global.lastReply[m.chat] && now - global.lastReply[m.chat] < 3000) {
            return; // skip jika spam
        }

        global.lastReply[m.chat] = now;

        // Kirim balasan
        if (db.autoreply.text) {
            await sock.sendMessage(m.chat, { text: db.autoreply.text }, { quoted: m });
        }

    } catch (err) {
        console.error("AutoReply Error:", err);
    }
}
//==================================//
let mode = db.self ? "Self" : "Public";
if (m.isGroup && db.pconly && !isOwner) return
if (!m.isGroup && db.grouponly && !isOwner) return
if (db.self && !isOwner) {
    if (isCmd) return;
}
 
//==================================//
   // =========================
    // CEKKUOTA 
    // =========================
const cekkoutaaxisxl = async (nomorhp) => {
  try {
    const { data } = await axios.get("https://xl-ku.my.id/end.php", {
      params: {
        check: "package",
        number: nomorhp,
        version: "2 201"
      },
      timeout: 15000
    })
    return data
  } catch (e) {
    return { status: false }
  }
}

function normalizeTo62(n) {
  if (!n) return null
  n = n.replace(/[^0-9]/g, "")
  if (n.startsWith("0")) n = "62" + n.slice(1)
  if (n.startsWith("8")) n = "62" + n
  if (!n.startsWith("62")) return null
  return n
}
 
   // =========================
    // GITHUB 
    // =========================
  
async function getGithubFile() {
    const fetch = (await import("node-fetch")).default;
    const url = `https://api.github.com/repos/${global.githubOwner}/${global.githubRepo}/contents/${global.githubFile}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `token ${global.githubToken}`,
            Accept: "application/vnd.github+json"
        }
    });
    if (!res.ok) throw new Error("Gagal ambil file GitHub");

    const data = await res.json();
    const text = Buffer.from(data.content, "base64").toString("utf-8");
    return { fetch, url, sha: data.sha, text };
}

async function updateGithubFile(fetch, url, sha, text, msg) {
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${global.githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: msg,
            content: Buffer.from(text).toString("base64"),
            sha
        })
    });
    if (!res.ok) throw new Error("GitHub menolak update");
}    
    
function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().split("T")[0]
}

function addDaysFrom(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().split("T")[0]
}    
 function diffDays(dateStr) {
  const today = new Date()
  const exp = new Date(dateStr)
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
  return diff
}  
    // =========================
    // CLODPLARE 
    // ========================= 
async function cfRequest(method, endpoint, body = null) {
  const fetch = (await import("node-fetch")).default

  const res = await fetch(
    `https://api.cloudflare.com/client/v4${endpoint}`,
    {
      method,
      headers: {
        "Authorization": `Bearer ${global.cfToken}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : null
    }
  )

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.errors?.[0]?.message || "Unknown CF error")
  }

  return json.result
}
 
// ================= INTERACTIVE ROUTER =================
if (m.message?.interactiveResponseMessage) {
  try {
    const res = JSON.parse(
      m.message.interactiveResponseMessage
        .nativeFlowResponseMessage
        .paramsJson
    )

    m.text = res.id
    m.command = res.id.split(" ")[0]
  } catch (e) {
    console.log("Interactive parse error:", e)
  }
} 
    // =========================
    // SWITCH COMMAND
    // ========================= 
switch (command) {
case "menu": {
  const img = JSON.parse(fs.readFileSync("./collection/thumbnail.json"))
  let teks = `
 @${m.sender.split("@")[0]}
${global.ucapan()}
Botmode ${mode}

════════════════════
📦 *STORE MENU*
════════════════════
• .list
• .addlist
• .dellist
• .config
• .panel
════════════════════
🏷️ *ZIVPN *
════════════════════
•trialzi
•createzi
•renewzi
•delzi


════════════════════
⚙️ *CONFIG MENU*
════════════════════
• .config
• .axis
• .xl
• .tsel
• .byu
• .smartfren
• .isat

════════════════════
🐙 *GITHUB IP MENU*
════════════════════
• .addip
• .renew
• .delip
• .listip
• .cekip
• cekip all
════════════════════
🌐 *CLOUDFLARE MENU*
════════════════════
• .addcf
• .listcf
• .delcf
• .
• .addwcs
• .listwcs
• .delwcs

════════════════════
📢 *AUTO / TOOLS*
════════════════════
• .autojoin on/off
• .autoreply on/off
• .setreply

• .onpromo
• .offpromo
• .statuspromo
• .listpromo
• .setpromo
• .setimgpromo
• .delpromo
• .cekpromo
• .setinterval
• .cekpromosi
• .antilink

• .bl
• .listbl
• .delbl
• .cekkuota 
• .yml
• .scc


════════════════════
📣 *CHANNEL MENU*
════════════════════
• .cekidch
• .buatch
• .listch
• .jpmch

════════════════════
👑 *OWNER MENU*
════════════════════
• .ownermenu
• .backup
• .resetdb
• .self
• .public

════════════════════
🛠️ *TOOLS*
════════════════════
• .catbox
• .rvbg
• .tt
• .ig
• .ytmp3
• .ytmp4
• .ai
• .textsound
• .emojimix
• .pinterest
• .brat
• .bratvid
• .uploadwa
• .tourl
• iPhone 
════════════════════

`;

let msg = await generateWAMessageFromContent(m.chat, {
  interactiveMessage: {
    header: {
      ...img,
      hasMediaAttachment: true
    },
    body: { 
      text: teks 
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Contact Developer",
            url: global.telegram
          })
        }
      ]
    },
    contextInfo: {
      mentionedJid: [m.sender]
    }
  }
}, { 
  quoted: fakeQuoted.ai
})

await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
break  

case "panel":

  const img = await axios.get("https://files.catbox.moe/glyv9c.jpg", {
    responseType: "arraybuffer"
  });

  await sock.sendMessage(m.chat, {
    image: Buffer.from(img.data),
    caption:
"╭───「 DIN PANEL 」───╮\n\n" +
"📊 1. Dashboard\n" +
"   └ .dashboard\n\n" +

"👤 2. Users\n" +
"   ├ .user list\n" +
"   ├ .user detail <username>\n" +
"   ├ .user addsaldo <username> <jumlah>\n" +
"   ├ .user minsaldo <username> <jumlah>\n" +
"   ├ .user role <username> <role>\n" +
"   ├ .user password <username> <password>\n" +
"   └ .user delete <username>\n\n" +

"🖥 3. Servers\n" +
"   ├ .server list\n" +
"   ├ .server add <name> <ip> <port>\n" +
"   ├ .server edit <id> <name>\n" +
"   └ .server delete <id>\n\n" +

"💳 4. PPOB\n" +
"   ├ .ppob list\n" +
"   ├ .ppob add <name> <price>\n" +
"   ├ .ppob edit <id> <name> <price>\n" +
"   └ .ppob delete <id>\n\n" +

"⚙️ 5. Settings\n" +
"   ├ .settings view\n" +
"   └ .settings edit <key> <value>\n\n" +

"🔐 6. Auth\n" +
"   ├ .auth view\n" +
"   └ .auth regen\n\n" +

"╰──────────────╯\n" +
"Ketik command untuk menjalankan fitur"
  });

break;

case "member": {
    // 🔒 khusus admin / owner
    if (!isOwner) return m.reply("❌ Khusus admin!")

    m.reply("⏳ ambil data member...")

    const axios = require("axios")

    try {
        let res = await axios.get("https://order.vpn.dinn.my.id/api/users", {
            params: {
                auth: "nexusc884b67b57d3"
            },
            timeout: 10000
        })

        let json = res.data

        if (json.status !== "success") {
            return m.reply("❌ " + json.message)
        }

        if (!json.data || json.data.length === 0) {
            return m.reply("❌ tidak ada member")
        }

        let teks = "👥 LIST MEMBER\n\n"

        json.data.forEach((u, i) => {
            teks += `${i+1}. ${u.username}\n`
            teks += `   💰 ${u.balance}\n`
            teks += `   🎭 ${u.role}\n`
            teks += `   📊 ${u.status}\n\n`
        })

        m.reply(teks)

    } catch (err) {
        console.log(err.response?.data || err.message)
        m.reply("❌ " + (err.response?.data?.message || err.message))
    }
}
break
// =========================
    // add saldo
    // =========================
case "+": {
    // 🔒 khusus admin / owner
    if (!isOwner) return m.reply("❌ Khusus admin!")

    const axios = require("axios")

    let [user, jumlah] = text.split("|")

    if (!user || !jumlah) {
        return m.reply("Format: .addsaldo username|jumlah")
    }

    user = user.trim()
    jumlah = jumlah.trim()

    // 🔥 validasi angka
    if (isNaN(jumlah) || Number(jumlah) <= 0) {
        return m.reply("❌ jumlah harus angka & lebih dari 0")
    }

    m.reply("⏳ menambahkan saldo...")

    try {
        let res = await axios.get("https://order.vpn.dinn.my.id/api/users", {
            params: {
                auth: "nexusc884b67b57d3",
                action: "add_saldo",
                username: user,
                amount: Number(jumlah) // 🔥 FIX pakai amount
            },
            timeout: 10000
        })

        let json = res.data

        if (json.status !== "success") {
            return m.reply("❌ " + json.message)
        }

        m.reply(`✅ saldo berhasil ditambah\n👤 ${user}\n💰 +${jumlah}`)

    } catch (err) {
        console.log(err.response?.data || err.message)
        m.reply("❌ " + (err.response?.data?.message || err.message))
    }
}
break
// =========================
    // min saldo
    // =========================
case "-": {
    // 🔒 khusus admin / owner
    if (!isOwner) return m.reply("❌ Khusus admin!")

    const axios = require("axios")

    let [user, jumlah] = text.split("|")

    if (!user || !jumlah) {
        return m.reply("Format: .minsaldo username|jumlah")
    }

    user = user.trim()
    jumlah = jumlah.trim()

    // 🔥 validasi angka
    if (isNaN(jumlah) || Number(jumlah) <= 0) {
        return m.reply("❌ jumlah harus angka & lebih dari 0")
    }

    m.reply("⏳ mengurangi saldo...")

    try {
        let res = await axios.get("https://order.vpn.dinn.my.id/api/users", {
            params: {
                auth: "nexusc884b67b57d3",
                action: "min_saldo",
                username: user,
                amount: Number(jumlah) // 🔥 FIX WAJIB
            },
            timeout: 10000
        })

        let json = res.data

        if (json.status !== "success") {
            return m.reply("❌ " + json.message)
        }

        m.reply(`✅ saldo berhasil dikurangi\n👤 ${user}\n💰 -${jumlah}`)

    } catch (err) {
        console.log(err.response?.data || err.message)
        m.reply("❌ " + (err.response?.data?.message || err.message))
    }
}
break
// =========================
    // cek saldo user
    // =========================
case "ceksaldo": {
    if (!isOwner) return m.reply("❌ Khusus admin!")

    const axios = require("axios")

    let user = text.trim()

    if (!user) {
        return m.reply("Format: .ceksaldo username")
    }

    m.reply("⏳ cek saldo user...")

    try {
        let res = await axios.get("https://order.vpn.dinn.my.id/api/users", {
            params: {
                auth: "nexusc884b67b57d3",
                username: user
            },
            timeout: 10000
        })

        let json = res.data

        if (json.status !== "success") {
            return m.reply("❌ " + json.message)
        }

        let u = json.data

        let teks = `👤 USER INFO\n\n`
        teks += `🧑 Username : ${u.username}\n`
        teks += `💰 Saldo    : ${u.balance}\n`
        teks += `🎭 Role     : ${u.role || "-"}\n`

        m.reply(teks)

    } catch (err) {
        console.log(err.response?.data || err.message)
        m.reply("❌ " + (err.response?.data?.message || err.message))
    }
}
break












// =========================
    // ZIVPN
    // =========================
case "trialziv": {

  // 🔒 KHUSUS ADMIN
  const sender = m.sender.split("@")[0];
  if (!global.owner.includes(sender))
    return m.reply("❌ Khusus admin!");

  try {
    m.reply("⏳ Membuat akun trial...");

    const axios = require("axios");

    const url = "http://tes.dinn.my.id:3306/trial-zivpn?auth=nexusbkeyhq0kpjr928dbuglk&exp=30";

    const res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    let data = res.data;

    // 🔥 parse kalau string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return m.reply("❌ Response tidak valid!");
      }
    }

    if (!data || data.status !== "success") {
      return m.reply("❌ Gagal membuat akun trial!");
    }

    const d = data.data;

    // 🔥 FORMAT HASIL
    let teks = `🔐 *TRIAL ZIVPN*\n`;
    teks += `━━━━━━━━━━━━━━━━━\n\n`;

    teks += `🌐 Host   : ${d.host}\n`;
    teks += `🌍 IP     : ${d.ip}\n`;
    teks += `🏢 ISP    : ${d.isp}\n\n`;

    teks += `🔑 Password : ${d.password}\n`;
    teks += `⏳ Expired : ${d.expired}\n`;
    teks += `📅 Exp Date: ${d.expiredDate}\n\n`;

    teks += `📥 Link Config:\n${d.saveLink}\n\n`;

    teks += `━━━━━━━━━━━━━━━━━\n`;
    teks += `🚀 Powered by DIN STORE`;

    m.reply(teks);

  } catch (err) {
    console.log("ERROR TRIAL:", err);

    if (err.code === "ECONNABORTED") {
      return m.reply("❌ Server lambat / timeout!");
    }

    m.reply("❌ Server trial error!");
  }
}
break;

case "createzi": {

  // 🔒 KHUSUS ADMIN
  const sender = m.sender.split("@")[0];
  if (!global.owner.includes(sender))
    return m.reply("❌ Khusus admin!");

  let [pass, hari] = text.split(" ");
  if (!pass || !hari)
    return m.reply("❌ Format salah!\n\nContoh:\n.createzi din123 30");

  try {
    m.reply("⏳ Membuat akun VPN...");

    const axios = require("axios");

    const url = `http://tes.dinn.my.id:3306/create-zivpn?auth=nexusbkeyhq0kpjr928dbuglk&password=${pass}&exp=${hari}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    let data = res.data;

    // parse kalau string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return m.reply("❌ Response tidak valid!");
      }
    }

    // ❌ kalau gagal → tampilkan alasan
    if (!data || data.status !== "success") {
      console.log("CREATE ERROR:", data);
      return m.reply(`❌ Gagal membuat akun VPN!\n\nResponse:\n${JSON.stringify(data, null, 2)}`);
    }

    const d = data.data;

    // ✅ FORMAT HASIL
    let teks = `🔐 *CREATE ZIVPN*\n`;
    teks += `━━━━━━━━━━━━━━━━━\n\n`;

    teks += `🔑 Password : ${d.password}\n`;
    teks += `🌐 Host     : ${d.host}\n`;
    teks += `🌍 IP       : ${d.ip}\n`;
    teks += `🏢 ISP      : ${d.isp}\n\n`;

    teks += `⏳ Expired  : ${d.expired}\n`;
    teks += `📅 Exp Date : ${d.expiredDate}\n\n`;

    teks += `📥 Link Config:\n${d.saveLink}\n\n`;

    teks += `━━━━━━━━━━━━━━━━━\n`;
    teks += `🚀 Powered by DIN STORE`;

    m.reply(teks);

  } catch (err) {
    console.log("ERROR CREATEZI:", err);

    if (err.code === "ECONNABORTED") {
      return m.reply("❌ Server lambat / timeout!");
    }

    m.reply("❌ Server create VPN error!");
  }
}
break;
case "renewzi": {

  // 🔒 KHUSUS ADMIN
  const sender = m.sender.split("@")[0];
  if (!global.owner.includes(sender))
    return m.reply("❌ Khusus admin!");

  let [pass, hari] = text.split(" ");

  if (!pass || !hari)
    return m.reply("❌ Format salah!\n\nContoh:\n.renewzi din123 30");

  try {
    m.reply("⏳ Memperpanjang akun VPN...");

    const axios = require("axios");

    const url = `http://tes.dinn.my.id:3306/renew-zivpn?auth=nexusbkeyhq0kpjr928dbuglk&password=${pass}&exp=${hari}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    let data = res.data;

    // parse kalau string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return m.reply("❌ Response tidak valid!");
      }
    }

    // ❌ kalau gagal
    if (!data || data.status !== "success") {
      console.log("RENEW ERROR:", data);
      return m.reply(`❌ Gagal renew akun!\n\nResponse:\n${JSON.stringify(data, null, 2)}`);
    }

    const d = data.data;

    // ✅ FORMAT HASIL
    let teks = `♻️ *RENEW ZIVPN*\n`;
    teks += `━━━━━━━━━━━━━━━━━\n\n`;

    teks += `🔑 Password : ${pass}\n`;
    teks += `⏳ Expired  : ${d.expired}\n`;
    teks += `📅 Exp Date : ${d.expiredDate}\n\n`;

    teks += `━━━━━━━━━━━━━━━━━\n`;
    teks += `🚀 Powered by DIN STORE`;

    m.reply(teks);

  } catch (err) {
    console.log("ERROR RENEWZI:", err);

    if (err.code === "ECONNABORTED") {
      return m.reply("❌ Server lambat / timeout!");
    }

    m.reply("❌ Server renew error!");
  }
}
break;

case 'rvo': {
    if (!m.quoted) return m.reply('❌ Reply pesan view once.');
    
    // Pastikan ini adalah pesan viewOnce
    if (!m.quoted.viewOnce) return m.reply('❌ Pesan tersebut bukan view once.');

    try {
        // Tentukan tipe media (image atau video)
        // mtype di log kamu berisi 'imageMessage' atau 'videoMessage'
        const type = m.quoted.mtype.replace('Message', ''); // Menjadi 'image' atau 'video'
        
        // Gunakan stream downloader
        const stream = await downloadContentFromMessage(m.quoted, type);
        
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Kirim media ke chat
        await sock.sendMessage(m.chat, {
            [type]: buffer, // Mengirim sebagai 'image' atau 'video'
            caption: m.quoted.text || ''
        }, { quoted: m });

    } catch (err) {
        console.error('Error saat download:', err);
        m.reply('❌ Gagal mengunduh media. Coba lagi nanti.\nError: ' + err.message);
    }
}
break;

                                   
// =========================
    // CONFIG MENU
    // =========================
    case "config":
    case "c": {
      const rows = [
        { title: ".AXIS WA", id: ".axis wa" },
        { title: "AXIS FB", id: ".axis fb" },
        { title: "AXIS GAME", id: ".axis game" },
        { title: "AXIS SHUSIROLL", id: ".axis shusiroll" },
        { title: "AXIS SPOTIFY", id: ".axis spotify" },
        { title: "AXIS MUSIK", id: ".axis musik" },
        { title: "AXIS EDU", id: ".axis edu" },
        { title: "AXIS VIDEO", id: ".axis video" },
        { title: "AXIS OPOK", id: ".axis opok" },
        { title: "AXIS CONFERENCE", id: ".axis conference" },

        { title: "XL EDU", id: ".xl edu" },
        { title: "XL SPOTIFY", id: ".xl spotify" },
        { title: "XL CONFERENCE", id: ".xl conference" },
        { title: "XL OPOK", id: ".xl opok" },
        { title: "XL VIDEO", id: ".xl video" },
        { title: "XL WA", id: ".xl wa" },
        { title: "XL COMBO", id: ".xl combo" },

        { title: "SMARTFREN OPOK", id: ".smartfren opok" },
        { title: "ISAT FUN", id: ".isat fun" },

        { title: "TSEL OPOK", id: ".tsel opok" },
        { title: "TSEL RUANGGURU", id: ".tsel ruangguru" },
        { title: "TSEL ILPED", id: ".tsel ilped" },

        { title: "BYU OPOK", id: ".byu opok" },
        { title: "BYU RUANGGURU", id: ".byu ruangguru" },
        { title: "BYU GGWP", id: ".byu ggwp" }
      ];

      let msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: "⚙️ *CONFIG MENU*\nPilih config yang ingin dikirim:" },
              nativeFlowMessage: {
                buttons: [{
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({
                    title: "📂 Pilih Config",
                    sections: [{ title: "Daftar Config", rows }]
                  })
                }]
              }
            }
          }
        }
      }, { quoted: m });

      await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    }
    break;

    // =========================
    // PROVIDER CASE
    // =========================
    case "axis":
    case "xl":
    case "tsel":
    case "byu":
    case "smartfren":
    case "isat": {

      if (!text) {
        await m.reply("❌ Pilih paket dulu\nContoh: .axis conference");
        break;
      }

      const provider = command.toLowerCase();
      const paket = text.toLowerCase()
        .replace(provider, "")
        .replace("confrence", "conference")
        .trim();

      const folderPath = `./config/${provider}/${paket}`;

      if (!fs.existsSync(folderPath)) {
        await m.reply(`❌ Folder tidak ditemukan:\n${provider}/${paket}`);
        break;
      }

      const files = fs.readdirSync(folderPath)
        .filter(f => fs.lstatSync(`${folderPath}/${f}`).isFile());

      if (files.length === 0) {
        await m.reply("❌ Folder kosong");
        break;
      }

      await m.reply(`📂 Mengirim ${files.length} config...`);

      for (const file of files) {
        await sock.sendMessage(
          m.chat,
          {
            document: fs.readFileSync(`${folderPath}/${file}`),
            mimetype: "application/octet-stream",
            fileName: file,
            caption: `✅ Berhasil mengirim config: *${file}*

⚠️ CONFIG BELUM SIAP DIGUNAKAN

Config ini masih kosong karena akun SSH belum diisi.
Sebelum menggunakan config, silakan buat dan masukkan akun SSH terlebih dahulu.

Kamu bisa memilih salah satu opsi berikut:

━━━━━━━━━━━━━━━━━━
🔹 SSH GRATIS
━━━━━━━━━━━━━━━━━━
Gunakan akun SSH gratis untuk kebutuhan standar (masa aktif terbatas).

• https://www.fastssh.com
• https://www.sshocean.com
• https://www.sshstores.net
• https://www.vpnjantit.com
• https://www.hidessh.com
• https://www.lionssh.com
• https://www.netq.me

━━━━━━━━━━━━━━━━━━
🚀 SSH PREMIUM
━━━━━━━━━━━━━━━━━━
Direkomendasikan untuk koneksi yang lebih stabil dan cepat.

👉 https://order.vpn.dinn.my.id

Keunggulan akun Premium:
- Koneksi lebih stabil
- Kecepatan maksimal
- Dukungan bantuan lebih cepat

━━━━━━━━━━━━━━━━━━
🛠️ CONFIG CUSTOM
━━━━━━━━━━━━━━━━━━
Jika ingin membuat config sendiri (payload & bug manual), silakan gunakan:
https://pypxyndz.vercel.app

Pastikan akun SSH sudah aktif sebelum mencoba kembali.`
  },
  { quoted: m }
);
}
}
break;
// =========================
    // CREATE QRIS
    // ========================= 

case "qris": {
  const amount = parseInt(m.text.split(" ")[1]);

  if (!amount || amount < 1)
    return m.reply("❌ Contoh:\n.qris 10000");

  try {
    m.reply("⏳ Membuat QRIS...");

    const res = await axios.get(`${API}/api/deposit`, {
      params: {
        amount: amount,
        apikey: API_KEY
      }
    });

    const data = res.data;

    if (data.status !== "success") {
      return m.reply("❌ Gagal membuat QRIS");
    }

    const d = data.data;

    const fee = Number(d.fee || 0);
    const total = Number(d.total_amount || amount);

    const caption = `💳 *PEMBAYARAN QRIS*

💸 Nominal : Rp ${amount.toLocaleString()}
💰 Fee     : Rp ${fee.toLocaleString()}
🧾 Total   : Rp ${total.toLocaleString()}

⏳ Expired : 5 menit
📌 ID TRX  : ${d.transaction_id}

Silahkan scan QR diatas untuk membayar ✅`;

    // kirim QRIS
    await sock.sendMessage(m.chat, {
      image: { url: d.qris_url },
      caption: caption
    }, { quoted: m });

    // 🔥 AUTO CEK STATUS
    const check = setInterval(async () => {
      try {
        const cek = await axios.get(`${API}/api/status/payment`, {
          params: {
            transaction_id: d.transaction_id,
            apikey: API_KEY
          }
        });

        if (cek.data.paid) {
          clearInterval(check);

          await m.reply(`✅ Pembayaran berhasil!

🧾 ID: ${d.transaction_id}
💰 Total: Rp ${total.toLocaleString()}

Terimakasih sudah melakukan pembayaran 🙏`);
        }

      } catch (e) {}
    }, 5000);

    // ⏳ AUTO STOP 5 MENIT
    setTimeout(() => clearInterval(check), 300000);

  } catch (err) {
    console.log(err);
    m.reply("❌ Error membuat QRIS");
  }
}
break;
case "saldo":
case "ceksaldo":
case "cek": {
  try {
    const saldo = await getSaldo();

    await sock.sendMessage(m.chat, {
      text: `💼 *CEK SALDO*

Saldo kamu saat ini:
💰 Rp ${saldo.toLocaleString()}

Silahkan gunakan dengan bijak 🙏`
    }, { quoted: m });

  } catch (err) {
    console.log(err);
    m.reply("❌ Gagal cek saldo!");
  }
}
break;
// =========================
    // DONE TRX
    // ========================= 
case "done": {
  try {
    // ❌ harus reply foto
    if (!m.quoted) 
      return m.reply("❌ Reply foto TRX!");

    // ambil nomor trx
    const args = m.text.trim().split(" ");
    const nomor = args[1];
    if (!nomor) 
      return m.reply("❌ Contoh:\n.done 99");

    // cek mime
    const mime = m.quoted.mimetype || "";
    if (!mime.includes("image"))
      return m.reply("❌ Harus reply foto!");

    const { downloadContentFromMessage } = require("@itsukichan/baileys");

    // 📥 download gambar
    const stream = await downloadContentFromMessage(m.quoted, "image");
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    // 📝 caption channel
    const caption = `📥 *BUKTI TRX*

#${nomor}

🔗 https://whatsapp.com/channel/0029VbC7C7rAYlUTEkAaqS2U`;

    // 🚀 kirim ke saluran
    await sock.sendMessage(global.idSaluran, {
      image: buffer,
      caption: caption
    });

    // ✅ balasan user + tombol
    await sock.sendMessage(m.chat, {
      text: "✅ Terimakasih, pembayaran sudah kami terima 🙏\n\nKlik tombol dibawah untuk melihat saluran kami 👇",
      contextInfo: {
        externalAdReply: {
          title: "📢 JOIN SALURAN DIN STORE",
          body: "Lihat bukti transaksi lainnya",
          thumbnailUrl: "https://whatsapp.com/channel/0029Vb0o48PKgsNu5DqoA33o",
          sourceUrl: "https://whatsapp.com/channel/0029Vaz4J9rHLHQaCsN2NN0O",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });

  } catch (err) {
    console.log("ERROR DONE:", err);
    m.reply("❌ Gagal upload ke saluran!");
  }
}
break;

    // =========================
    // CREATE AKUN YML
    // ========================= 
case "yml":
case "yaml": {
  if (!text) return m.reply("Contoh:\n.yml vmess://xxxx")

  const yml = convertYML(text)
  if (yml.startsWith("❌")) return m.reply(yml)

  const tmpDir = "./Tmp"
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

  const fileName = `config-${Date.now()}.yml`
  const filePath = path.join(tmpDir, fileName)

  fs.writeFileSync(filePath, yml)

  await sock.sendMessage(m.chat, {
    document: fs.readFileSync(filePath),
    mimetype: "text/yaml",
    fileName: fileName,
    caption: "✅ YAML berhasil dibuat"
  }, { quoted: m })

  fs.unlinkSync(filePath)
}
break
// =========================
    // AI GPT
    // ========================= 
case "ai":
case "gpt": {
  if (!text) return m.reply("❌ Masukkan pertanyaan!\nContoh:\n.ai halo apa kabar?")

  try {
    await m.reply("🤖 AI sedang berpikir...")

    const prompt = "Aku adalah AI asisten cerdas"

    const res = await fetch(
      `https://api.yydz.biz.id/api/ai/gpt3?prompt=${encodeURIComponent(prompt)}&q=${encodeURIComponent(text)}&apikey=DINSTORE`
    )

    const json = await res.json()
    console.log("AI RESPONSE:", json)

    if (!json.status && !json.result) {
      return m.reply("❌ AI tidak merespon")
    }

    const reply =
      json.result ||
      json.response ||
      json.data ||
      "⚠️ AI tidak memberikan jawaban"

    await m.reply(reply)

  } catch (e) {
    console.log("AI ERROR:", e)
    m.reply("⚠️ Error AI, coba lagi nanti")
  }
}
break

// =========================
    // IG DOWNLOAD 
    // ========================= 


case "ig": {
  if (!text) return m.reply("❌ Kirim link Instagram")

  await m.reply("⏳ Downloading Instagram...")

  const res = await indown(text)

  if (!res.status) {
    return m.reply("❌ Media tidak ditemukan / IG private")
  }

  await sock.sendMessage(m.chat, {
    video: { url: res.url },
    caption: "✅ Instagram Download"
  }, { quoted: m })
}
break
// =========================
    // TIKTOK DOWNLOAD 
    // ========================= 
case "tt":
case "tiktok": {
  if (!text)
    return m.reply(
`❌ *Link TikTok belum dikirim!*

Contoh:
.tt https://vt.tiktok.com/xxxx`
    )

  // pesan proses awal
  const waitMsg = await sock.sendMessage(
    m.chat,
    { text: "⏳ *Menghubungi server TikTok...*" },
    { quoted: m }
  )

  try {
    // update proses
    await sock.sendMessage(m.chat, {
      text: "📥 *Mengambil data video...*",
      edit: waitMsg.key
    })

    const res = await fetch(
      `https://tikwm.com/api/?url=${encodeURIComponent(text)}`
    )
    const json = await res.json()

    if (!json.data) {
      await sock.sendMessage(m.chat, {
        text: "❌ *Gagal mengambil data TikTok*",
        edit: waitMsg.key
      })
      return
    }

    // update proses
    await sock.sendMessage(m.chat, {
      text: "🎬 *Mengirim video ke WhatsApp...*",
      edit: waitMsg.key
    })

    const video = json.data.play
    const music = json.data.music
    const title = json.data.title || "TikTok Video"

    await sock.sendMessage(
      m.chat,
      {
        video: { url: video },
        caption: `🎵 *${title}*\n\n✅ Tanpa watermark`
      },
      { quoted: m }
    )

    // update proses
    await sock.sendMessage(m.chat, {
      text: "🎧 *Mengirim audio...*",
      edit: waitMsg.key
    })

    await sock.sendMessage(
      m.chat,
      {
        audio: { url: music },
        mimetype: "audio/mpeg",
        fileName: "tiktok.mp3"
      },
      { quoted: m }
    )

    // selesai
    await sock.sendMessage(m.chat, {
      text: "✅ *Selesai!* Video & audio berhasil dikirim",
      edit: waitMsg.key
    })

  } catch (e) {
    console.log("TT ERROR:", e)
    await sock.sendMessage(m.chat, {
      text: "⚠️ *TikTok error!* Server down / link invalid",
      edit: waitMsg.key
    })
  }
}
break
// =========================
    // HAPUS BACKGROUND 
    // ========================= 
case "removebg":
case "rvbg": {
  try {
    const quoted = m.quoted ? m.quoted : m
    const mime = (quoted.msg || quoted).mimetype || ""

    if (!/image/.test(mime)) {
      return m.reply("⚠️ Reply gambar dengan perintah .removebg")
    }

    await m.reply("⏳ Menghapus background...")

    const media = await quoted.download()
    const html = await axios.get("https://www.iloveimg.com/remove-background")

    const token = html.data.match(/"token":"([^"]+)"/)?.[1]
    const task = html.data.match(/taskId\s*=\s*'([^']+)'/)?.[1]

    if (!token || !task) return m.reply("❌ Gagal ambil token")

    const imagePath = `./tmp_${Date.now()}.jpg`
    fs.writeFileSync(imagePath, media)

    const form = new FormData()
    form.append("name", imagePath.split("/").pop())
    form.append("chunk", "0")
    form.append("chunks", "1")
    form.append("task", task)
    form.append("preview", "1")
    form.append("pdfinfo", "0")
    form.append("pdfforms", "0")
    form.append("pdfresetforms", "0")
    form.append("v", "web.0")
    form.append("file", fs.readFileSync(imagePath), {
      filename: imagePath.split("/").pop(),
      contentType: "image/jpeg"
    })

    const upload = await axios.post(
      "https://api5g.iloveimg.com/v1/upload",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
          origin: "https://www.iloveimg.com",
          referer: "https://www.iloveimg.com/"
        }
      }
    )

    const proses = await axios.post(
      "https://api5g.iloveimg.com/v1/removebackground",
      new URLSearchParams({
        task,
        server_filename: upload.data.server_filename
      }).toString(),
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          origin: "https://www.iloveimg.com",
          referer: "https://www.iloveimg.com/"
        }
      }
    )

    fs.unlinkSync(imagePath)

    await sock.sendMessage(
      m.chat,
      {
        image: proses.data,
        caption: "✅ Background berhasil dihapus"
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply("❌ Gagal remove background (limit / server error)")
  }
}
break
// =========================
    // CATBOX 
    // ========================= 
case "catbox":
case "upload": {
  const axios = require("axios")
  const FormData = require("form-data")

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ""
  if (!mime) return m.reply("Reply gambar / file yang mau diupload!")

  m.reply("⏳ Uploading ke Catbox...")

  try {
    let buffer = await q.download()
    if (!buffer) return m.reply("❌ Gagal download media")

    // Tentukan ekstensi biar rapih
    const ext =
      mime.includes("png") ? "png" :
      mime.includes("webp") ? "webp" :
      mime.includes("gif") ? "gif" :
      mime.includes("jpeg") || mime.includes("jpg") ? "jpg" :
      mime.includes("mp4") ? "mp4" :
      mime.includes("pdf") ? "pdf" : "bin"

    const filename = `file.${ext}`

    const form = new FormData()
    form.append("reqtype", "fileupload")
    form.append("fileToUpload", buffer, filename)

    const res = await axios.post(
      "https://catbox.moe/user/api.php",
      form,
      {
        headers: { ...form.getHeaders(), "User-Agent": "Mozilla/5.0" },
        timeout: 30000
      }
    )

    const url = (typeof res.data === "string" ? res.data.trim() : "")
    if (!url.startsWith("https://")) return m.reply("⚠️ Upload gagal / Catbox error")

    // Kalau gambar → kirim HTML siap pakai
    if (mime.startsWith("image/")) {
      const html =
`<img src="${url}" alt="image" style="max-width:100%;height:auto;" />`

      return sock.sendMessage(
        m.chat,
        {
          text:
`✅ Upload berhasil!
🔗 Link: ${url}

📄 HTML (copy-paste):
${html}`
        },
        { quoted: m }
      )
    }

    // Kalau bukan gambar
    await sock.sendMessage(
      m.chat,
      { text: `✅ Upload berhasil!\n🔗 Link: ${url}` },
      { quoted: m }
    )

  } catch (e) {
    m.reply("⚠️ Catbox server error / timeout, coba lagi")
  }
}
break

// =========================
    // YOUTUBE DOWNLOAD 
    // ========================= 
case "ytmp4": {
  const axios = require("axios")

  if (!text) return m.reply("Contoh: .ytmp4 https://youtu.be/xxxx")
  m.reply("⏳ Mengunduh video...")

  try {
    // ambil link download
    const { data } = await axios.get(
      "https://p.lbserver.xyz/ajax/download.php",
      {
        params: {
          url: text,
          format: "360", // ⬅️ pakai 360p biar pasti masuk WA
          copyright: 0,
          api: "dfcb6d76f2f6a9894gjkege8a4ab232222"
        },
        timeout: 20000
      }
    )

    let json
    for (let i = 0; i < 800; i++) {
      await new Promise(r => setTimeout(r, 40))
      const res = await axios.get(data.progress_url)
      json = res.data
      if (json?.download_url) break
    }

    if (!json?.download_url)
      return m.reply("⚠️ Video belum siap, coba ulang")

    // DOWNLOAD VIDEO KE BUFFER
    const video = await axios.get(json.download_url, {
      responseType: "arraybuffer",
      timeout: 60000
    })

    await sock.sendMessage(
      m.chat,
      {
        video: Buffer.from(video.data),
        caption: "🎬 Video selesai"
      },
      { quoted: m }
    )

  } catch (e) {
    m.reply("⚠️ Video terlalu besar / server lambat")
  }
}
break

case "ytmp3": {
  const axios = require("axios")

  if (!text) return m.reply("Contoh: .ytmp3 https://youtu.be/xxxx")
  m.reply("⏳ Mengunduh audio...")

  try {
    // 1. minta proses audio
    const { data } = await axios.get(
      "https://p.lbserver.xyz/ajax/download.php",
      {
        params: {
          url: text,
          format: "mp3",
          audio_quality: "128",
          copyright: 0,
          api: "dfcb6d76f2f6a9894gjkege8a4ab232222"
        },
        timeout: 20000
      }
    )

    if (!data?.progress_url)
      return m.reply("⚠️ Server tidak respon")

    // 2. polling (max 30 detik)
    let json
    for (let i = 0; i < 750; i++) {
      await new Promise(r => setTimeout(r, 40))
      const res = await axios.get(data.progress_url)
      json = res.data
      if (json?.download_url) break
    }

    if (!json?.download_url)
      return m.reply("⚠️ Audio belum siap, coba ulang")

    // 3. download audio
    const audio = await axios.get(json.download_url, {
      responseType: "arraybuffer",
      timeout: 60000
    })

    // 4. kirim ke WA (FIX)
    await sock.sendMessage(
      m.chat,
      {
        audio: Buffer.from(audio.data),
        mimetype: "audio/mpeg",
        fileName: "youtube.mp3"
      },
      { quoted: m }
    )

  } catch (e) {
    m.reply("⚠️ Audio terlalu besar / server lambat")
  }
}
break




// =========================
    // CEK KUOTA 
    // ========================= 
case "cekkouta":
case "cekkuota":
case "axisxl": {
  let number = normalizeTo62(text)

  if (!number)
    return m.reply("Contoh:\n.cekkouta 0812xxxxxxx")

  m.reply("*🔎 Mengecek kuota...*")

  const res = await cekkoutaaxisxl(number)

  if (!res || res.success === false)
    return m.reply("❌ Gagal cek kuota")

  try {
    const subs = res.data.subs_info
    const pkg = res.data.package_info.packages?.[0]

    let teks = `
📊 *INFO KARTU*

📱 Nomor     : ${subs.msisdn}
📡 Operator  : ${subs.operator}
✅ Verifikasi: ${subs.id_verified}
🌐 Jaringan  : ${subs.net_type}
📆 Umur Kartu: ${subs.tenure}

📅 Masa Aktif  : ${subs.exp_date}
⏳ Masa Tenggang    : ${subs.grace_until}

📶 VoLTE:
- Device  : ${subs.volte.device ? "✅" : "❌"}
- Area    : ${subs.volte.area ? "✅" : "❌"}
- SIMCARD : ${subs.volte.simcard ? "✅" : "❌"}

━━━━━━━━━━━━━━━
📦 *PAKET AKTIF*
`

    if (pkg) {
      teks += `
📌 ${pkg.name}
📅 Expired : ${pkg.expiry}

📊 Kuota:
`

      pkg.quotas.forEach(q => {
        teks += `- ${q.name}
  ✔ ${q.remaining} / ${q.total} (${q.percent}%)
`
      })
    } else {
      teks += "\n❌ Tidak ada paket aktif"
    }

    return m.reply(teks)

  } catch (err) {
    return m.reply("❌ Error parsing data")
  }
}
break;
// =========================
    // CEK SUBDOMAIN
    // ========================= 
case "ceksubdo": {
  if (!text) return m.reply("Contoh: .ceksubdo private-server.snaydzx.cloud");

  try {
    const api = `https://api.siputzx.my.id/api/tools/subdomains?domain=${encodeURIComponent(text)}`;
    const res = await fetch(api);
    const json = await res.json();

    if (!json.status) {
      return m.reply("❌ Gagal mengambil data subdomain.");
    }

    if (!json.data || json.data.length === 0) {
      return m.reply("⚠️ Tidak ditemukan subdomain.");
    }

    let hasil = `🔍 *Hasil Subdomain*\n🌐 Domain: ${text}\n\n`;

    json.data.forEach((sub, i) => {
      hasil += `${i + 1}. ${sub}\n`;
    });

    await sock.sendMessage(m.chat, {
      text: hasil
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply("❌ Terjadi error saat cek subdomain.");
  }
}
break;        
        // =========================
    // SCREENSHOT WEB
    // ========================= 
 case "ssweb": {
  if (!text) return m.reply("Contoh: .ssweb https://google.com");

  const url = `https://zelapioffciall.koyeb.app/tools/ssweb?url=${encodeURIComponent(text)}`;

  await sock.sendMessage(m.chat, {
    image: { url },
    caption: "📸 Screenshot Website"
  }, { quoted: m });
}
break;      


// =========================
    // ADDO WNER 
    // =========================        
 case "addowner": {
  if (!isOwner) return m.reply("❌ Khusus owner")

  let number
  if (m.mentionedJid?.[0]) {
    number = m.mentionedJid[0].split("@")[0]
  } else if (text) {
    number = text.replace(/[^0-9]/g, "")
  }

  if (!number) return m.reply("❌ Contoh:\n.addowner 628xxxx")

  // baca setting.js
  let data = fs.readFileSync("./setting.js", "utf-8")

  // ambil owner array
  let match = data.match(/global\.owner\s*=\s*\[([\s\S]*?)\]/)
  let owners = match
    ? match[1].split(",").map(v => v.replace(/["'\s]/g, "")).filter(Boolean)
    : []

  if (owners.includes(number))
    return m.reply("⚠️ Nomor sudah owner")

  owners.push(number)

  // tulis ulang setting.js
  const newOwnerBlock =
`global.owner = []`

  data = data.replace(
    /global\.owner\s*=\s*\[[\s\S]*?\]/,
    newOwnerBlock
  )

  fs.writeFileSync("./setting.js", data)

  // update memory biar langsung aktif
  global.owner = owners

  m.reply(`✅ Owner ditambahkan & disimpan ke setting.js\n👤 ${number}`)
}
break
        
          // =========================
    // DELOWNER 
    // =========================
 case "delowner": {
  if (!isOwner) return m.reply("❌ Khusus owner");

  let number;
  if (m.mentionedJid && m.mentionedJid[0]) {
    number = m.mentionedJid[0].split("@")[0];
  } else if (text) {
    number = text.replace(/[^0-9]/g, "");
  }

  if (!number)
    return m.reply("❌ Tag atau masukkan nomor\nContoh: .delowner 628xxxx");

  if (!global.owner.includes(number))
    return m.reply("⚠️ Nomor ini bukan owner");

  // cegah hapus owner utama (opsional)
  if (number === global.owner[0])
    return m.reply("❌ Owner utama tidak bisa dihapus");

  global.owner = global.owner.filter(v => v !== number);

  m.reply(`🗑️ Owner berhasil dihapus\n👤 ${number}`);
}
break;      
 
case "listowner": {
  if (!isOwner) return m.reply("❌ Khusus owner")

  if (!global.owner || global.owner.length === 0)
    return m.reply("⚠️ Tidak ada owner")

  let teks = "👑 *DAFTAR OWNER*\n\n"

  global.owner.forEach((o, i) => {
    teks += `${i + 1}. ${o}\n`
  })

  teks += `\nTotal: ${global.owner.length} owner`

  await sock.sendMessage(m.chat, { text: teks }, { quoted: m })
}
break        
  // =========================
    // ADDCF
    // =========================
   case "addcf": {
  if (!isOwner) return m.reply("❌ Owner only")

  const [sub, ip] = text.split(" ")
  if (!sub || !ip) {
    return m.reply(
`❌ Format salah

Contoh:
.createcf test 1.1.1.1`
    )
  }

  try {
    await cfRequest("POST", `/zones/${global.cfZoneId}/dns_records`, {
      type: "A",
      name: `${sub}.${global.cfDomain}`,
      content: ip,
      ttl: 1,
      proxied: false
    })

    m.reply(
`✅ SUBDOMAIN BERHASIL

🌐 ${sub}.${global.cfDomain}
📡 IP : ${ip}
⏱ TTL : AUTO`
    )

  } catch (e) {
    m.reply("❌ Cloudflare Error:\n" + e.message)
  }
}
break
  // =========================
    // DELCF
    // =========================
case "delcf": {
  if (!isOwner) return m.reply("❌ Owner only")

  const sub = text.trim()
  if (!sub) {
    return m.reply(
`❌ Format salah

Contoh:
.delsudo test`
    )
  }

  const fullDomain = `${sub}.${global.cfDomain}`

  try {
    const records = await cfRequest(
      "GET",
      `/zones/${global.cfZoneId}/dns_records?type=A&name=${fullDomain}`
    )

    if (!records.length)
      return m.reply("❌ Subdomain tidak ditemukan")

    await cfRequest(
      "DELETE",
      `/zones/${global.cfZoneId}/dns_records/${records[0].id}`
    )

    m.reply(`✅ SUBDOMAIN DIHAPUS\n\n🌐 ${fullDomain}`)
  } catch (e) {
    m.reply("❌ Cloudflare Error:\n" + e.message)
  }
}
break
     
 // =========================
// LISTCF
// =========================
case "listcf": {
  if (!isOwner) return m.reply("❌ Owner only")

  try {
    const records = await cfRequest(
      "GET",
      `/zones/${global.cfZoneId}/dns_records?type=A&per_page=100`
    )

    if (!records || records.length === 0) {
      return m.reply("❌ Tidak ada DNS record")
    }

    let teks = `📄 *LIST SUBDOMAIN (${records.length})*\n\n`

    records.forEach((r, i) => {
      teks += `${i + 1}. ${r.name}\n   📡 ${r.content}\n\n`
    })

    m.reply(teks.trim())

  } catch (e) {
    m.reply("❌ Cloudflare Error:\n" + e.message)
  }
}
break   
        
        
        // =========================
    // ADDIP
    // =========================
case "addip": {
  // 🔒 ONLY OWNER
  if (!isOwner) {
    return sock.sendMessage(m.chat, {
      text: "❌ Command ini khusus owner"
    }, { quoted: m })
  }

  try {
    const args = m.text.trim().split(/\s+/).slice(1)
    if (args.length < 3)
      return sock.sendMessage(m.chat, {
        text: "❌ Contoh:\n.addip sg1 30 157.245.150.246\n.addip sg1 2026-02-20 157.245.150.246"
      }, { quoted: m })

    const name = args[0]
    const mid  = args[1]
    const ip   = args[2]

    let date
    if (/^\d+$/.test(mid)) {
      date = addDays(mid)
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(mid)) {
      date = mid
    } else {
      return sock.sendMessage(m.chat, {
        text: "❌ Parameter ke-2 harus angka (hari) atau YYYY-MM-DD"
      }, { quoted: m })
    }

    const newLine = `### ${name} ${date} ${ip}`
    const url = "https://api.github.com/repos/DIN-STORE/izin/contents/ip"

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    })

    const data = await res.json()
    const oldText = Buffer.from(data.content, "base64").toString("utf-8")

    if (oldText.includes(`### ${name} `)) {
      return sock.sendMessage(m.chat, {
        text: "⚠️ Nama sudah ada, gunakan .extendip"
      }, { quoted: m })
    }

    const newText = oldText.trimEnd() + "\n" + newLine + "\n"

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `add ip ${name}`,
        content: Buffer.from(newText).toString("base64"),
        sha: data.sha
      })
    })

    await sock.sendMessage(m.chat, {
      text: `✅ IP ditambahkan\n\n${newLine}`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    sock.sendMessage(m.chat, { text: "❌ Gagal add IP" }, { quoted: m })
  }
}
break     
         
  // =========================
    // LIST IP
    // =========================
  case "listip": {
  // 🔒 ONLY OWNER (creator + owner tambahan)
  if (!isOwner) {
    return sock.sendMessage(m.chat, {
      text: "❌ Command ini khusus owner"
    }, { quoted: m })
  }

  try {
    const url = "https://api.github.com/repos/DIN-STORE/izin/contents/ip"

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    })

    if (!res.ok) throw new Error(await res.text())

    const data = await res.json()
    const content = Buffer.from(data.content, "base64").toString("utf-8")

    await sock.sendMessage(m.chat, {
      text: `📋 *LIST IP*\n\n${content || "(kosong)"}`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    await sock.sendMessage(m.chat, {
      text: "❌ Gagal mengambil list IP"
    }, { quoted: m })
  }
}
break        
          // =========================
    // PERPANJANG 
    // =========================
case "renew": {
  // 🔒 ONLY OWNER (creator + owner tambahan)
  if (!isOwner) {
    return sock.sendMessage(m.chat, {
      text: "❌ Command ini khusus owner"
    }, { quoted: m })
  }

  try {
    const args = m.text.trim().split(/\s+/).slice(1)
    if (args.length < 2)
      return sock.sendMessage(m.chat, {
        text: "❌ Contoh:\n.renew sg1 30"
      }, { quoted: m })

    const name = args[0]
    const days = args[1]

    if (!/^\d+$/.test(days))
      return sock.sendMessage(m.chat, {
        text: "❌ Hari harus angka"
      }, { quoted: m })

    const url = "https://api.github.com/repos/DIN-STORE/izin/contents/ip"

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    })

    const data = await res.json()
    let text = Buffer.from(data.content, "base64").toString("utf-8")

    const lines = text.split("\n")
    let found = false

    const updated = lines.map(l => {
      if (l.startsWith(`### ${name} `)) {
        const parts = l.split(" ")
        const newDate = addDaysFrom(parts[2], days)
        found = true
        return `### ${name} ${newDate} ${parts[3]}`
      }
      return l
    })

    if (!found)
      return sock.sendMessage(m.chat, {
        text: "❌ Nama tidak ditemukan"
      }, { quoted: m })

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `renew ip ${name}`,
        content: Buffer.from(updated.join("\n")).toString("base64"),
        sha: data.sha
      })
    })

    await sock.sendMessage(m.chat, {
      text: `✅ IP ${name} diperpanjang ${days} hari`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    sock.sendMessage(m.chat, { text: "❌ Gagal renew IP" }, { quoted: m })
  }
}
break
  // =========================
    // DEL IP
    // =========================
case "delip": {
  // 🔒 ONLY OWNER (creator + owner tambahan)
  if (!isOwner) {
    return sock.sendMessage(m.chat, {
      text: "❌ Command ini khusus owner"
    }, { quoted: m })
  }

  try {
    const name = m.text.split(" ")[1]
    if (!name) {
      return sock.sendMessage(m.chat, {
        text: "❌ Contoh:\n.delip bot"
      }, { quoted: m })
    }

    const url = "https://api.github.com/repos/DIN-STORE/izin/contents/ip"

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    })

    const data = await res.json()
    let text = Buffer.from(data.content, "base64").toString("utf-8")

    const lines = text.split("\n")
    const filtered = lines.filter(l => !l.startsWith(`### ${name} `))

    if (lines.length === filtered.length) {
      return sock.sendMessage(m.chat, {
        text: "❌ Nama tidak ditemukan"
      }, { quoted: m })
    }

    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `delete ip ${name}`,
        content: Buffer.from(filtered.join("\n")).toString("base64"),
        sha: data.sha
      })
    })

    await sock.sendMessage(m.chat, {
      text: `✅ IP *${name}* berhasil dihapus`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    sock.sendMessage(m.chat, { text: "❌ Gagal hapus IP" }, { quoted: m })
  }
}
break      
      // =========================
    // CEK IP
    // =========================
 case "cekip": {
  // 🔒 ONLY OWNER (creator + owner tambahan)
  if (!isOwner) {
    return sock.sendMessage(m.chat, {
      text: "❌ Command ini khusus owner"
    }, { quoted: m })
  }

  try {
    const args = m.text.trim().split(/\s+/).slice(1)
    const url = "https://api.github.com/repos/DIN-STORE/izin/contents/ip"

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${global.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    })

    if (!res.ok) {
      return sock.sendMessage(m.chat, {
        text: "❌ Gagal mengambil data IP"
      }, { quoted: m })
    }

    const data = await res.json()
    const text = Buffer.from(data.content, "base64").toString("utf-8")
    const lines = text.split("\n").filter(l => l.startsWith("### "))

    if (lines.length === 0) {
      return sock.sendMessage(m.chat, {
        text: "⚠️ Tidak ada IP di database"
      }, { quoted: m })
    }

    // =========================
    // CEK SEMUA
    // =========================
    if (args[0] === "all" || args[0] === "semua") {
      let out = "📋 *DAFTAR IP*\n\n"

      for (const l of lines) {
        const [, name, date, ip] = l.split(" ")
        const sisa = diffDays(date)

        let status = "🟢"
        if (sisa < 0) status = "🔴"
        else if (sisa <= 3) status = "🟡"

        out += `${status} ${name}\n`
        out += `IP: ${ip}\n`
        out += `Exp: ${date} (${sisa} hari)\n\n`
      }

      return sock.sendMessage(m.chat, { text: out }, { quoted: m })
    }

   
    // =========================
    // CEK SATU
    // =========================
    if (args.length < 1) {
      return sock.sendMessage(m.chat, {
        text: "❌ Contoh:\n.cekip sg1\n.cekip all"
      }, { quoted: m })
    }

    const name = args[0]
    const line = lines.find(l => l.startsWith(`### ${name} `))

    if (!line) {
      return sock.sendMessage(m.chat, {
        text: `❌ IP *${name}* tidak ditemukan`
      }, { quoted: m })
    }

    const [, , date, ip] = line.split(" ")
    const sisa = diffDays(date)

    let status = "🟢 AKTIF"
    if (sisa < 0) status = "🔴 EXPIRED"
    else if (sisa <= 3) status = "🟡 HAMPIR HABIS"

    return sock.sendMessage(m.chat, {
      text:
`📌 *CEK IP*

Nama    : ${name}
IP      : ${ip}
Expired : ${date}
Sisa    : ${sisa} hari
Status  : ${status}`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    sock.sendMessage(m.chat, { text: "❌ Error cek IP" }, { quoted: m })
  }
}
break
        
// =========================
// SCC INSTALLER
// =========================
case "scc": {
  await sock.sendMessage(m.chat, {
    text:
`📦 *SC INSTALLER*

Silakan jalankan command ini di VPS:

\`\`\`
wget -q https://raw.githubusercontent.com/Din-store/vip/main/setup.sh && chmod +x setup.sh && ./setup.sh
\`\`\`

✅ Copy & paste ke VPS`
  }, { quoted: m })
}
break
        
   // =========================
    // IP text 
    // =========================     
        
// iPhone txs
 case "ip":
case "iphone": {
    if (!text) return m.reply(`Contoh:\n${prefix + cmd} Aku kangen kamu`);

    try {
        const fetch = (await import("node-fetch")).default;

        // waktu otomatis jam:menit
        const timeParam = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const message = encodeURIComponent(text);

        // API baru sesuai permintaan kamu
        const apiURL = `https://brat.siputzx.my.id/iphone-quoted?time=${timeParam}&messageText=${message}`;

        await m.reply("⏳ Membuat iPhone quoted...");

        // Ambil hasil gambar dari API
        const res = await fetch(apiURL);
        if (!res.ok) return m.reply("❌ API bermasalah, coba lagi.");

        const buffer = await res.buffer();

        // Kirim ke WhatsApp
        await sock.sendMessage(
            m.chat,
            { image: buffer, caption: "✔ iPhone Quoted" },
            { quoted: m }
        );

    } catch (err) {
        console.error(err);
        return m.reply("❌ Error saat membuat iPhone quoted.");
    }
}
break;
            
        
        

 case "autoreply": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`Masukan opsi autoreply on/off\nContoh:\n${cmd} on`);

    if (/on/i.test(text)) {
        db.autoreply.status = true;
        await RefreshDb(db);
        return m.reply(`Fitur *Auto Reply Private Chat* berhasil diaktifkan ✅`);
    }

    if (/off/i.test(text)) {
        db.autoreply.status = false;
        await RefreshDb(db);
        return m.reply(`Fitur *Auto Reply Private Chat* berhasil dimatikan ❌`);
    }

    return m.reply(`Format salah!\nContoh:\n${cmd} on`);
}
break;
case "setreply": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`Masukan teks autoreply!\nContoh:\n${cmd} Halo ada yang bisa saya bantu?`);

    db.autoreply.text = text;
    await RefreshDb(db);

    return m.reply(`Teks Auto Reply berhasil disimpan:\n\n"${text}"`);
}
break;
case "autojoin": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`Masukan opsi autojoin on/off\n*Contoh:* ${cmd} on`);

    if (/on/i.test(text)) {
        db.autojoin = true;
        await RefreshDb(db);
        return m.reply("Fitur *Auto Join Grup* berhasil diaktifkan ✅");
    }

    if (/off/i.test(text)) {
        db.autojoin = false;
        await RefreshDb(db);
        return m.reply("Fitur *Auto Join Grup* berhasil dimatikan ❌");
    }

    return m.reply(`Masukan opsi autojoin on/off\n*Contoh:* ${cmd} on`);
}
break;
case "textsound": {
    if (!text) return m.reply(`❗ Contoh:\n${prefix + cmd} Halo, saya bot Fyxzpedia`);

    try {
        await m.reply("🎙️ Sedang mengubah teks menjadi suara...");

        const fetch = (await import("node-fetch")).default;

        // API
        let apiURL = `https://sitesfyxzpedia-api.vercel.app/tools/text-to-speech?apikey=Fyxz&text=${encodeURIComponent(text)}`;

        let res = await fetch(apiURL);
        if (!res.ok) return m.reply("⚠️ API tidak merespon!");

        let data = await res.json();

        // Cek hasil
        if (!data.status || !data.result || !data.result[0]?.url) {
            return m.reply("❌ Gagal mendapatkan suara dari API.");
        }

        let soundURL = data.result[0].url;

        // Download file audio
        let audioRes = await fetch(soundURL);
        let audioBuffer = await audioRes.buffer();

        // Kirim audio ke WA
        await sock.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: "audio/mpeg", // WhatsApp auto-convert jika bukan mp3
            ptt: false              // ganti true jika mau jadi VN / voice note
        }, { quoted: m });

    } catch (err) {
        console.error("TextSound Error:", err);
        m.reply("❌ Terjadi kesalahan saat membuat suara.");
    }
}
break;
case "emojimix": {
    if (!text) return m.reply(`❗ Contoh:\n${prefix + cmd} 🥹+🥺`);

    try {
        // Pisahkan emoji (format: emoji1+emoji2)
        let [emoji1, emoji2] = text.split("+");

        if (!emoji1 || !emoji2) {
            return m.reply(`❗ Format salah!\nContoh:\n${prefix + cmd} 😭+😱`);
        }

        emoji1 = emoji1.trim();
        emoji2 = emoji2.trim();

        await m.reply(`⏳ Menggabungkan ${emoji1} + ${emoji2} ...`);

        const fetch = (await import("node-fetch")).default;
        const { Sticker, StickerTypes } = require("wa-sticker-formatter");

        // Encode emoji untuk URL
        let apiURL = `https://sitesfyxzpedia-api.vercel.app/tools/emojimix?apikey=Fyxz&emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;

        let res = await fetch(apiURL);
        if (!res.ok) return m.reply("⚠️ API tidak merespon!");

        let buffer = await res.buffer();

        // Convert ke sticker aman (WA-safe)
        let sticker = new Sticker(buffer, {
            type: StickerTypes.FULL,
            pack: "EmojiMix by Fyxzpedia",
            author: "emojimix"
        });

        let stc = await sticker.toBuffer();

        await sock.sendMessage(m.chat, { sticker: stc }, { quoted: m });

    } catch (err) {
        console.error("EmojiMix Error:", err);
        m.reply("❌ Gagal membuat emojimix, coba ulangi.");
    }
}
break;
case "pinterest": {
    if (!text) return m.reply(`❗ Contoh:\n${prefix + cmd} Google`);

    try {
        await m.reply("🔍 Sedang mencari gambar di Pinterest...");

        const fetch = (await import("node-fetch")).default;

        let apiURL = `https://sitesfyxzpedia-api.vercel.app/search/pinterest?apikey=Fyxz&q=${encodeURIComponent(text)}`;

        // Fetch API
        let res = await fetch(apiURL);
        if (!res.ok) return m.reply("⚠️ API tidak merespon!");

        let data = await res.json();

        if (!data.status || !data.result || data.result.length === 0) {
            return m.reply("🔍 Tidak ada hasil ditemukan.");
        }

        // Ambil 5 gambar pertama
        let hasil = data.result.slice(0, 5);

        for (let img of hasil) {
            try {
                await sock.sendMessage(m.chat, {
                    image: { url: img },
                    caption: `🔗 *Pinterest Search*\nKata Kunci: *${text}*`
                }, { quoted: m });
            } catch(e) {
                console.error("Send Pinterest Error:", e);
            }
        }

    } catch (err) {
        console.error("Pinterest Error:", err);
        m.reply("❌ Terjadi kesalahan saat mengambil gambar.");
    }
}
break;
  // =========================
    // SELF PUBLIC 
    // =========================
 case "self": {
  if (!isOwner) return m.reply(mess.owner)

  global.db.self = true
  RefreshDb(global.db)

  m.reply("🛑 *Mode SELF diaktifkan*\nBot hanya merespon owner")
}
break

case "public": {
  if (!isOwner) return m.reply(mess.owner)

  global.db.self = false
  RefreshDb(global.db)

  m.reply("🌍 *Mode PUBLIC diaktifkan*\nBot merespon semua user")
}
break      
          // =========================
    // BRATVID
    // =========================
case "bratvid": {
    if (!text) return m.reply(`Contoh: ${prefix + cmd} Fyxzpedia`);

    try {
        await m.reply("⏳ Sedang membuat sticker brat video...");

        const fetch = (await import("node-fetch")).default;
        const { Sticker, StickerTypes } = require("wa-sticker-formatter");

        let apiURL = `https://sitesfyxzpedia-api.vercel.app/imagecreator/bratvid?apikey=Fyxz&text=${encodeURIComponent(text)}`;

        let res = await fetch(apiURL);
        if (!res.ok) return m.reply("⚠️ API tidak merespon!");

        let buffer = await res.buffer();

        let sticker = new Sticker(buffer, {
            type: StickerTypes.FULL,
            pack: "DINSTORE",
            author: "Brat Video Generator"
        });

        let stc = await sticker.toBuffer();

        await sock.sendMessage(m.chat, { sticker: stc }, { quoted: m });

    } catch (err) {
        console.error(err);
        m.reply("❌ Gagal membuat sticker brat video.");
    }
}
break;
case "uploadwa": {

    if (!/image/.test(mime)) return m.reply("Reply foto!");

    let buffer = await (m.quoted ? m.quoted.download() : m.download());

    let hasil = await sock.sendMessage(m.chat, { image: buffer });

    let url = hasil.message.imageMessage.url;

    return m.reply(`URL Media WhatsApp:\n${url}`);

}

break;
 
case "tourl": {
    if (!/image|video|audio|application/.test(mime)) 
        return m.reply(`❌ Media tidak ditemukan!\nReply/kirim media lalu ketik *${cmd}*`);

    const FormData = require("form-data");
    const { fromBuffer } = require('file-type');

    async function uploadCatbox(buffer) {
        const fetch = (await import("node-fetch")).default;
        const { ext } = await fromBuffer(buffer);

        const form = new FormData();
        form.append("fileToUpload", buffer, "file." + ext);
        form.append("reqtype", "fileupload");

        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: form
        });

        return await res.text();
    }

    let media = m.quoted ? await m.quoted.download() : await m.download();
    let result = await uploadCatbox(media);

    // interactive copy button
    let msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: `✅ *Upload sukses!*\n\nURL:\n${result}` },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: `{"display_text":"Copy URL","copy_code":"${result}"}`
                            }
                        ]
                    }
                }
            }
        }
    }, { userJid: m.sender, quoted: m });

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
}
  // =========================
    // BACKUP 
    // =========================
break;
case "backupsc":
case "bck":
case "backup": {
    if (!isOwner) return m.reply(mess.owner);
    try {
        const tmpDir = "./Tmp";
        
        // Bersihkan file di folder Tmp kecuali .js
        if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir).filter(f => !f.endsWith(".js"));
            for (let file of files) {
                fs.unlinkSync(`${tmpDir}/${file}`);
            }
        }

        await m.reply("⏳ *Processing Backup Script...*\nTunggu sebentar.");

        const name = `StoreBotz-V7`;

        // Folder/Files yang tidak ingin di-backup
        const exclude = [
            "node_modules",
            "Fyxzpedia",
            "ConnectSession",
            "session",
            "package-lock.json",
            "yarn.lock",
            ".npm",
            ".cache",
            "Tmp",
            "Backup-Script-V6.zip"
        ];

        // Ambil semua file/folder yang tidak masuk blacklist
        const filesToZip = fs.readdirSync(".")
            .filter(f => !exclude.includes(f) && f.trim() !== "");

        if (!filesToZip.length)
            return m.reply("❌ Tidak ada file yang dapat di-backup.");

        // Proses ZIP
        execSync(`zip -r ${name}.zip ${filesToZip.join(" ")}`);

        // Kirim hasil backup via private chat
        await sock.sendMessage(
            m.sender,
            {
                document: fs.readFileSync(`./${name}.zip`),
                fileName: `${name}.zip`,
                mimetype: "application/zip"
            },
            { quoted: m }
        );

        // Hapus zip setelah mengirim
        fs.unlinkSync(`./${name}.zip`);

        // Jika command dipakai di grup → konfirmasi
        if (m.chat !== m.sender)
            m.reply("✅ *Backup Script berhasil dikirim ke private chat Anda!*");

    } catch (err) {
        console.error("Backup Error:", err);
        m.reply("⚠️ Terjadi kesalahan saat melakukan backup.");
    }
}
break;
case "installpanel": {
    if (!isOwner) return m.reply(mess.owner)
    if (!text) return m.reply("\nFormat salah!\n\n*Contoh penggunaan :*\nketik .instalpanel ipvps|pwvps|panel.com|node.com|ramserver *(contoh 100000)*");
    
    let vii = text.split("|");
    if (vii.length < 5) return m.reply("\nFormat salah!\n\n*Contoh penggunaan :*\nketik .instalpanel ipvps|pwvps|panel.com|node.com|ramserver *(contoh 100000)*");
    
    const ssh2 = require("ssh2");
    const ress = new ssh2.Client();
    const connSettings = {
        host: vii[0],
        port: '22',
        username: 'root',
        password: vii[1]
    };
    
    const jids = m.chat
    const pass = "admin001";
    let passwordPanel = pass;
    const domainpanel = vii[2];
    const domainnode = vii[3];
    const ramserver = vii[4];
    const deletemysql = `\n`;
    const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`;
    
    async function instalWings() {
    ress.exec(commandPanel, async (err, stream) => {
        if (err) {
            console.error('Wings installation error:', err);
            m.reply(`Gagal memulai instalasi Wings: ${err.message}`);
            return ress.end();
        }
        
        stream.on('close', async (code, signal) => {
            await InstallNodes()            
        }).on('data', async (data) => {
            const dataStr = data.toString();
            console.log('Wings Install: ' + dataStr);
            
            if (dataStr.includes('Input 0-6')) {
                stream.write('1\n');
            }
            else if (dataStr.includes('(y/N)')) {
                stream.write('y\n');
            }
            else if (dataStr.includes('Enter the panel address (blank for any address)')) {
                stream.write(`${domainpanel}\n`);
            }
            else if (dataStr.includes('Database host username (pterodactyluser)')) {
                stream.write('admin\n');
            }
            else if (dataStr.includes('Database host password')) {
                stream.write('admin\n');
            }
            else if (dataStr.includes('Set the FQDN to use for Let\'s Encrypt (node.example.com)')) {
                stream.write(`${domainnode}\n`);
            }
            else if (dataStr.includes('Enter email address for Let\'s Encrypt')) {
                stream.write('admin@gmail.com\n');
            }
        }).stderr.on('data', async (data) => {
            console.error('Wings Install Error: ' + data);
            m.reply(`Error pada instalasi Wings:\n${data}`);
        });
    });
}

    async function InstallNodes() {
        ress.exec('bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/createnode.sh)', async (err, stream) => {
            if (err) throw err;
            
            stream.on('close', async (code, signal) => {
                
    let teks = `
*Install Panel Telah Berhasil ✅*

*Berikut Detail Akun Panel Kamu 📦*

👤 Username : \`${usernamePanel}\`
🔐 Password : \`${passwordPanel}\`
🌐 ${domainpanel}

Silahkan setting allocation & ambil token node di node yang sudah dibuat oleh bot.

*Cara menjalankan wings :*
\`.startwings ipvps|pwvps|tokennode\`
    `;

    let msg = await generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: teks },
                    nativeFlowMessage: {
                        buttons: [
                            { 
                                name: "cta_copy",
                                buttonParamsJson: `{"display_text":"Copy Username","copy_code":"${usernamePanel}"}`
                            },
                            { 
                                name: "cta_copy",
                                buttonParamsJson: `{"display_text":"Copy Password","copy_code":"${passwordPanel}"}`
                            },
                            { 
                                name: "cta_url",
                                buttonParamsJson: `{"display_text":"Login Panel","url":"${domainpanel}"}`
                            }
                        ]
                    }, 
                    contextInfo: {
                    isForwarded: true
                    }
                }
            }
        }
    }, {});

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
                
                ress.end();
            }).on('data', async (data) => {
                await console.log(data.toString());
                if (data.toString().includes("Masukkan nama lokasi: ")) {
                    stream.write('Singapore\n');
                }
                if (data.toString().includes("Masukkan deskripsi lokasi: ")) {
                    stream.write('Node By Skyzo\n');
                }
                if (data.toString().includes("Masukkan domain: ")) {
                    stream.write(`${domainnode}\n`);
                }
                if (data.toString().includes("Masukkan nama node: ")) {
                    stream.write('Fyxzpedia\n');
                }
                if (data.toString().includes("Masukkan RAM (dalam MB): ")) {
                    stream.write(`${ramserver}\n`);
                }
                if (data.toString().includes("Masukkan jumlah maksimum disk space (dalam MB): ")) {
                    stream.write(`${ramserver}\n`);
                }
                if (data.toString().includes("Masukkan Locid: ")) {
                    stream.write('1\n');
                }
            }).stderr.on('data', async (data) => {
                console.log('Stderr : ' + data);
                m.reply(`Error pada instalasi Wings: ${data}`);
            });
        });
    }

    async function instalPanel() {
        ress.exec(commandPanel, (err, stream) => {
            if (err) throw err;
            
            stream.on('close', async (code, signal) => {
                await instalWings();
            }).on('data', async (data) => {
                if (data.toString().includes('Input 0-6')) {
                    stream.write('0\n');
                } 
                if (data.toString().includes('(y/N)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('Database name (panel)')) {
                    stream.write('\n');
                }
                if (data.toString().includes('Database username (pterodactyl)')) {
                    stream.write('admin\n');
                }
                if (data.toString().includes('Password (press enter to use randomly generated password)')) {
                    stream.write('admin\n');
                } 
                if (data.toString().includes('Select timezone [Europe/Stockholm]')) {
                    stream.write('Asia/Jakarta\n');
                } 
                if (data.toString().includes('Provide the email address that will be used to configure Let\'s Encrypt and Pterodactyl')) {
                    stream.write('admin@gmail.com\n');
                } 
                if (data.toString().includes('Email address for the initial admin account')) {
                    stream.write('admin@gmail.com\n');
                } 
                if (data.toString().includes('Username for the initial admin account')) {
                    stream.write('admin\n');
                } 
                if (data.toString().includes('First name for the initial admin account')) {
                    stream.write('admin\n');
                } 
                if (data.toString().includes('Last name for the initial admin account')) {
                    stream.write('admin\n');
                } 
                if (data.toString().includes('Password for the initial admin account')) {
                    stream.write(`${passwordPanel}\n`);
                } 
                if (data.toString().includes('Set the FQDN of this panel (panel.example.com)')) {
                    stream.write(`${domainpanel}\n`);
                } 
                if (data.toString().includes('Do you want to automatically configure UFW (firewall)')) {
                    stream.write('y\n')
                } 
                if (data.toString().includes('Do you want to automatically configure HTTPS using Let\'s Encrypt? (y/N)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('Select the appropriate number [1-2] then [enter] (press \'c\' to cancel)')) {
                    stream.write('1\n');
                } 
                if (data.toString().includes('I agree that this HTTPS request is performed (y/N)')) {
                    stream.write('y\n');
                }
                if (data.toString().includes('Proceed anyways (your install will be broken if you do not know what you are doing)? (y/N)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('(yes/no)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('Initial configuration completed. Continue with installation? (y/N)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('Still assume SSL? (y/N)')) {
                    stream.write('y\n');
                } 
                if (data.toString().includes('Please read the Terms of Service')) {
                    stream.write('y\n');
                }
                if (data.toString().includes('(A)gree/(C)ancel:')) {
                    stream.write('A\n');
                } 
                console.log('Logger: ' + data.toString());
            }).stderr.on('data', (data) => {
                m.reply(`Error Terjadi kesalahan :\n${data}`);
                console.log('STDERR: ' + data);
            });
        });
    }

    ress.on('ready', async () => {
        await m.reply(`*Memproses install server panel 🚀*\n\n` +
                     `*IP Address:* ${vii[0]}\n` +
                     `*Domain Panel:* ${domainpanel}\n\n` +
                     `Mohon tunggu 10-20 menit hingga proses install selesai`);
        
        ress.exec(deletemysql, async (err, stream) => {
            if (err) throw err;
            
            stream.on('close', async (code, signal) => {
                await instalPanel();
            }).on('data', async (data) => {
                await stream.write('\t');
                await stream.write('\n');
                await console.log(data.toString());
            }).stderr.on('data', async (data) => {
                m.reply(`Error Terjadi kesalahan :\n${data}`);
                console.log('Stderr : ' + data);
            });
        });
    });

    ress.on('error', (err) => {
        console.error('SSH Connection Error:', err);
        m.reply(`Gagal terhubung ke server: ${err.message}`);
    });

    ress.connect(connSettings);
}
break

case "startwings":
case "configurewings": {
    if (!isOwner) return m.reply(mess.owner)
    let t = text.split('|');
    if (t.length < 3) return m.reply("\nFormat salah!\n\n*Contoh penggunaan :*\nketik .startwings ipvps|pwvps|token_wings");

    let ipvps = t[0].trim();
    let passwd = t[1].trim();
    let token = t[2].trim();

    const connSettings = {
        host: ipvps,
        port: 22,
        username: 'root',
        password: passwd
    };

    const command = `${token} && systemctl start wings`;

    const ress = new ssh2.Client();

    ress.on('ready', () => {
        ress.exec(command, (err, stream) => {
            if (err) {
                m.reply('Gagal menjalankan perintah di VPS');
                ress.end();
                return;
            }

            stream.on('close', async (code, signal) => {
                await m.reply("Berhasil menjalankan wings node panel pterodactyl ✅");
                ress.end();
            }).on('data', (data) => {
                console.log("STDOUT:", data.toString());
            }).stderr.on('data', (data) => {
                console.log("STDERR:", data.toString());
                // Opsi jika perlu input interaktif
                stream.write("y\n");
                stream.write("systemctl start wings\n");
                m.reply('Terjadi error saat eksekusi:\n' + data.toString());
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error:', err.message);
        m.reply('Gagal terhubung ke VPS: IP atau password salah.');
    }).connect(connSettings);
}
break;
//==================================//
case "brat": {
  if (!text) return m.reply(`Contoh: ${prefix + cmd} Fyxzpedia`)

  try {
    const loading = await m.reply("⏳ Membuat sticker brat...")

    const fetch = (await import("node-fetch")).default
    const { Sticker, StickerTypes } = require("wa-sticker-formatter")

    const url = `https://sitesfyxzpedia-api.vercel.app/imagecreator/bratv?apikey=Fyxz&text=${encodeURIComponent(text)}`
    const res = await fetch(url, { timeout: 15000 })

    if (!res.ok)
      return m.reply("⚠️ API tidak merespon, coba lagi nanti")

    const buffer = await res.buffer()

    const sticker = new Sticker(buffer, {
      type: StickerTypes.FULL,
      pack: "DINSTORE",
      author: "Brat Generator"
    })

    const stc = await sticker.toBuffer()
    await sock.sendMessage(m.chat, { sticker: stc }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply("❌ Gagal membuat sticker brat")
  }
}
break
   // =========================
    // Addlist 
    // =========================
case "addlist": {
    if (!isOwner) return m.reply(mess.owner);

    let key, list;
    if (text.includes("@")) {
        const split = text.split("@");
        key = split[0];
        list = split[1];
    } else {
        key = text;
        list = m.quoted?.text || "";
    }

    if (!key || !list) {
        return m.reply(
`Format: ${cmd} key@list
Atau reply teks lalu ketik: ${cmd} key
Support dengan foto juga.`
        );
    }

    key = key.toLowerCase();
    db.list[key] = {};

    let buffer = null;
    if (/image/.test(mime)) {
        buffer = m.quoted
            ? await m.quoted.download()
            : await m.download();
    }

    if (buffer) {
        const url = await uploadImageBuffer(buffer);
        if (url) db.list[key].image = url;
    }

    db.list[key].response = list;
    await RefreshDb(db);

    return m.reply(
        buffer
        ? `Berhasil menambah list key *${key}* dengan foto.`
        : `Berhasil menambah list dengan key *${key}*.`
    );
}
break;

//==================================//

case "list": {
    if (!db.list || Object.keys(db.list).length === 0)
        return m.reply("Belum ada list yang tersimpan.")

    const teks = Object.keys(db.list)
        .map((v, i) => `${i + 1}. ${v}`)
        .join("\n")

    return m.reply(`📄 *Daftar List Tersimpan:*\n\n${teks}`)
}
break

//==============dellist====================//

case "dellist": {
    if (!isOwner) return m.reply(mess.owner)
    if (!text) return m.reply(`Format: ${cmd} keynya`)
    const key = text.toLowerCase()
    if (key.toLowerCase() == "all") {
    db.list = {}
    await RefreshDb(db)
    return m.reply(`Berhasil menghapus semua list yang ada di dalam database.`)
    }
    if (!db.list || !db.list[key])
        return m.reply(`Key *${key}* tidak ditemukan.`)
    delete db.list[key]
    await RefreshDb(db)
    return m.reply(`Berhasil menghapus list dengan key *${key}*.`)
}
break

//==================================//


case "pay": case "payment": {
let teks = `
*List Payment DINSTORE*

- Dana: ${global.dana}
- seabank: ${global.ovo}
- Gopay: ${global.gopay}
- QRIS: ${global.qris}

_> Screenshot Bukti TF , Baru Saya Proses_
`
try {
await sock.sendMessage(m.chat, { image: { url: global.qris }, caption: teks, contextInfo: { isForwarded: true }})
} catch (err) {
await sock.sendMessage(m.chat, { text: teks, contextInfo: { isForwarded: true }})
}
}
break

//==================================//

case "set":
case "setimg":
case "setpoto": {
  try {
    const mime = (m.quoted || m.msg).mimetype || ""

    if (!/image/.test(mime))
      return m.reply(`Reply atau kirim foto dengan ketik ${cmd}`)

    const media = m.quoted ? await m.quoted.download() : await m.download()

    const dir = "./collection"
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    const upload = await prepareWAMessageMedia(
      { image: media },
      { upload: sock.waUploadToServer }
    )

    fs.writeFileSync(
      `${dir}/thumbnail.json`,
      JSON.stringify(upload, null, 2)
    )

    m.reply("✅ Thumbnail berhasil diganti")
  } catch (e) {
    console.error(e)
    m.reply("❌ Gagal mengganti thumbnail")
  }
}
break

//==================================//


        
 case "statusbot":
case "botstatus":
case "status": {
  if (!isOwner) return m.reply(mess.owner)

  const status = v => v ? "🟢 Aktif" : "🔴 Nonaktif"

  const rows = [
    {
      title: `Auto Promosi : ${status(db?.autopromosi?.status)}`,
      id: ".toggle autopromosi"
    },
    {
      title: `Group Only : ${status(db?.grouponly)}`,
      id: ".toggle grouponly"
    },
    {
      title: `PC Only : ${status(db?.pconly)}`,
      id: ".toggle pconly"
    },
    {
      title: `Welcome : ${status(db?.welcome)}`,
      id: ".toggle welcome"
    },
    {
      title: "🔄 Refresh",
      id: ".statusbot"
    }
  ]

  let msg = await generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: { text: "🤖 *STATUS BOT*\nKlik untuk ON / OFF" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "⚙️ Pengaturan",
                  sections: [
                    {
                      title: "Bot Status",
                      rows
                    }
                  ]
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: m })

  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
break      
        
        
//==================================//

case "resetdb": {
    if (!isOwner) return m.reply(mess.owner)
    const pathdb = './collection/database.json'
global.db = {
    welcome: true,
    pconly: false,
    grouponly: false,
    autopromosi: {},
    antilink: [],
    bljpm: [],
    list: {},
    autojoin: false,
    autoreply: { status: false, text: "" }
}
    fs.writeFileSync(pathdb, JSON.stringify(global.db, null, 2))
    m.reply("Database berhasil di-reset ke default ✅")
}
break

//==================================//

case "bljpm":
case "bl": {
  if (!isOwner) return m.reply(mess.owner)

  let groups
  try {
    groups = await sock.groupFetchAllParticipating()
  } catch {
    return m.reply("❌ Gagal mengambil daftar grup.")
  }

  const data = Object.values(groups || {})
  if (!data.length) return m.reply("Tidak ada grup chat.")

  const rows = data.slice(0, 50).map(g => ({
    title: g.subject || "Unknown",
    description: g.id,
    id: `bljpm-response ${g.id}|${g.subject || "Unknown"}`
  }))

  await sock.sendMessage(m.chat, {
    interactiveMessage: {
      body: { text: "📛 *Pilih grup untuk blacklist JPM*" },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "Daftar Grup",
              sections: [
                {
                  title: "Group Chat",
                  rows
                }
              ]
            })
          }
        ]
      }
    }
  }, { quoted: m })
}
break
  

//==================================//

case "bljpm-response": {
  if (!isOwner) return m.reply(mess.owner)
  if (!db.bljpm) db.bljpm = []

  const res = JSON.parse(
    m.message.interactiveResponseMessage
      .nativeFlowResponseMessage
      .paramsJson
  )

  const data = res.id.replace("bljpm-response ", "")
  const [groupId, groupName] = data.split("|")

  if (!groupId) return m.reply("❌ ID grup tidak valid")

  if (db.bljpm.includes(groupId))
    return m.reply(`❌ ${groupName} sudah ada di blacklist`)

  db.bljpm.push(groupId)

  m.reply(`✅ ${groupName} berhasil masuk blacklist JPM`)
}
break        
        
  case "listbl":
case "listjpm": {
  if (!isOwner) return m.reply(mess.owner)

  if (!global.db.bljpm || global.db.bljpm.length === 0) {
    return m.reply("📭 *Blacklist JPM masih kosong*")
  }

  let teks = `📄 *LIST BLACKLIST JPM*\n\n`

  for (let i = 0; i < global.db.bljpm.length; i++) {
    teks += `${i + 1}. ${global.db.bljpm[i]}\n`
  }

  m.reply(teks)
}
break      
        
  case "delbl":
case "unbljpm": {
  if (!isOwner) return m.reply(mess.owner)

  if (!global.db.bljpm || global.db.bljpm.length === 0)
    return m.reply("📭 Blacklist masih kosong")

  if (!text) return m.reply("❌ Contoh: .delbl 1")

  const index = parseInt(text) - 1
  if (isNaN(index) || !global.db.bljpm[index])
    return m.reply("❌ Nomor tidak valid")

  const removed = global.db.bljpm.splice(index, 1)

  m.reply(`✅ Berhasil hapus blacklist:\n${removed[0]}`)
}
break      
//###############################//
        
        
        
 //setpromosi       
        
 case "cekpromosi": {
  if (!isOwner) return m.reply(mess.owner)

  if (!global.db.autopromo || !global.db.autopromo.on) {
    return m.reply("ℹ️ *Autopromosi belum aktif*")
  }

  const intervalJam = (global.db.autopromo.interval || (6 * 60 * 60 * 1000)) / 3600000
  const lastRunTs = Number(global.db.autopromo.lastRun) || 0

  let lastRunText = "Belum pernah"
  let nextRunText = "Belum terjadwal"

  if (lastRunTs > 0) {
    const lastDate = new Date(lastRunTs)
    const nextDate = new Date(lastRunTs + intervalJam * 60 * 60 * 1000)

    lastRunText = lastDate.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta"
    }) + " WIB"

    nextRunText = nextDate.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta"
    }) + " WIB"
  }

  let info =
`📢 *AUTOPROMOSI JPM AKTIF*

⏱ Interval : ${intervalJam} jam
🕒 Last Run : ${lastRunText}
⏭ Next JPM : ${nextRunText}

📝 *Teks Promosi:*
${global.db.autopromo.text || "(tidak ada teks)"}
`

  // kalau ada gambar
  if (global.db.autopromo.image && fs.existsSync(global.db.autopromo.image)) {
    return sock.sendMessage(
      m.chat,
      {
        image: fs.readFileSync(global.db.autopromo.image),
        caption: info
      },
      { quoted: m }
    )
  }

  return m.reply(info)
}
break      
        
case "setpromo": {
  if (!isOwner) return m.reply(mess.owner)
  if (!text) return m.reply("❌ Kirim teks promosinya")

  global.db.autopromo.text = text
  m.reply("✅ Teks promosi berhasil disimpan")
}
break        
        
 case "setpromopic": {
  if (!isOwner) return m.reply(mess.owner)

  let q = m.quoted || m
  let mime = (q.msg || q).mimetype || ""

  if (!mime.includes("image"))
    return m.reply("❌ Reply / kirim gambar dengan caption .setpromopic")

  let buffer = await q.download()
  let path = `./database/promo.jpg`

  require("fs").writeFileSync(path, buffer)

  global.db.autopromo.image = path
  m.reply("✅ Gambar promosi disimpan")
}
break      
        
        
 case "onpromo": {
  if (!isOwner) return m.reply("Owner only")

  global.db.autopromo.on = true
  m.reply("✅ Autopromosi *DIHIDUPKAN* (6 jam sekali)")
}
break      
        
case "offpromo": {
  if (!isOwner) return m.reply("Owner only")

  global.db.autopromo.on = false
  m.reply("⛔ Autopromosi *DIMATIKAN*")
}
break        
        
        
 case "statuspromo": {
  if (!isOwner) return m.reply("Owner only")

  const ap = global.db.autopromo
  m.reply(
`📢 STATUS AUTOPROMO

Status : ${ap.on ? "ON ✅" : "OFF ❌"}
Interval : ${ap.interval / 3600000} jam
Last Run : ${
  ap.lastRun
    ? new Date(ap.lastRun).toLocaleString("id-ID")
    : "Belum pernah"
}`
  )
}
break      
        
case "delpromo": {
  if (!isOwner) return m.reply("Owner only")

  if (!global.db.autopromo) return m.reply("❌ Autopromo belum di-set")

  global.db.autopromo.text = ""
  global.db.autopromo.image = null

  m.reply("✅ Isi promosi berhasil dihapus (teks & gambar)")
}
break        
 case "listpromo":
case "cekpromo": {
  if (!isOwner) return m.reply("Owner only")

  const ap = global.db.autopromo
  if (!ap) return m.reply("❌ Autopromo belum di-set")

  let last = ap.lastRun
    ? new Date(ap.lastRun).toLocaleString("id-ID")
    : "Belum pernah"

  let next = ap.lastRun
    ? new Date(ap.lastRun + ap.interval).toLocaleString("id-ID")
    : "-"

  let teks =
`📢 *AUTOPROMO STATUS*

Status   : ${ap.on ? "ON ✅" : "OFF ❌"}
Interval : ${ap.interval / 3600000} jam
Last Run : ${last}
Next Run : ${next}

📝 *Teks Promo:*
${ap.text || "(kosong)"}

🖼 Gambar : ${ap.image ? "ADA" : "TIDAK ADA"}`

  if (ap.image && fs.existsSync(ap.image)) {
    return sock.sendMessage(
      m.chat,
      {
        image: fs.readFileSync(ap.image),
        caption: teks
      },
      { quoted: m }
    )
  }

  m.reply(teks)
}
break      
//////////////////////
case "welcome": {
  if (!isOwner) return m.reply(mess.owner);

  if (!text)
    return m.reply(`Masukan opsi welcome on/off\n*Contoh:* ${cmd} on`);

  if (/on/i.test(text)) {
    db.welcome = true;
    await RefreshDb(db);
    return m.reply(`Sukses mengaktifkan welcome ✅`);
  }

  if (/off/i.test(text)) {
    db.welcome = false;
    await RefreshDb(db);
    return m.reply(`Sukses mematikan welcome ✅`);
  }

  return m.reply(`Masukan opsi welcome on/off\n*Contoh:* ${cmd} on`);
}
break;

//==================================//

case "grouponly": case "gconly": {
  if (!isOwner) return m.reply(mess.owner);
  if (!text) return m.reply(`Masukan opsi grouponly on/off\n*Contoh:* ${cmd} on`);

  if (/on/i.test(text)) {
    db.grouponly = true;
    await RefreshDb(db);
    return m.reply(`Mode *Group Only* berhasil diaktifkan ✅`);
  } 
  
  if (/off/i.test(text)) {
    db.grouponly = false;
    await RefreshDb(db);
    return m.reply(`Mode *Group Only* berhasil dimatikan ✅`);
  }

  return m.reply(`Masukan opsi grouponly on/off\n*Contoh:* ${cmd} on`);
}
break;

//==================================//

case "pconly": {
  if (!isOwner) return m.reply(mess.owner);
  if (!text) return m.reply(`Masukan opsi pconly on/off\n*Contoh:* ${cmd} on`);

  if (/on/i.test(text)) {
    db.pconly = true;
    await RefreshDb(db);
    return m.reply(`Mode *Private Chat Only* berhasil diaktifkan ✅`);
  } 
  
  if (/off/i.test(text)) {
    db.pconly = false;
    await RefreshDb(db);
    return m.reply(`Mode *Private Chat Only* berhasil dimatikan ✅`);
  }

  return m.reply(`Masukan opsi pconly on/off\n*Contoh:* ${cmd} on`);
}
break;

//==================================//

case "antilink": {
  if (!isOwner) return m.reply(mess.owner);
  if (!m.isGroup) return m.reply(mess.group)
  if (!text) return m.reply(`Masukan opsi antilink on/off\n*Contoh:* ${cmd} on`);

  if (/on/i.test(text)) {
    if (db.antilink.includes(m.chat)) return m.reply(`Antilink Berhasil di Aktifkan dalam Grup ${m.metadata.subject} ✅`);
    db.antilink.push(m.chat)
    await RefreshDb(db);
    return m.reply(`Antilink Berhasil di Aktifkan dalam Grup ${m.metadata.subject} ✅`);
  } 
  
  if (/off/i.test(text)) {
    if (!db.antilink.includes(m.chat)) return m.reply("Antilink Tidak di Aktifkan dalam Grup ini.")
    let ind = db.antilink.indexOf(m.chat)
    db.antilink.splice(ind, 1)
    await RefreshDb(db);
    return m.reply(`Antilink Berhasil di Aktifkan dalam Grup ${m.metadata.subject} ✅`);
  }

  return m.reply(`Masukan opsi pconly on/off\n*Contoh:* ${cmd} on`);
}
break;

//==================================//


    

//==================================//



//==================================//

case "createch": {
if (!isOwner) return m.reply(mess.owner)
if (!text) return m.reply(`Masukan nama channel!\n*Contoh:* ${cmd} Fyxzpedia`)
let { id, invite, name } = await sock.newsletterCreate(text)
let result = `
*Channel WhatsApp Berhasil Dibuat ✅*

- ID: ${id}
- Nama: ${name}
- https://whatsapp.com/channel/${invite}
`
return m.reply(result)
}
break

//==================================//

case "listch":
case "listchannel": {
  if (!isOwner) return m.reply(mess.owner)

  let a = await sock.newsletterFetchAllParticipating()
  let gc = Object.values(a)

  if (!gc.length) return m.reply("❌ Tidak ada channel")

  const rows = gc.map(u => ({
    title: u.name,
    description: `👥 ${toRupiah(u.subscribers)} followers`,
    id: `.cekidch ${u.id}`
  }))

  let msg = await generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: `📣 *LIST CHANNEL*\nTotal: ${gc.length}`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "📂 Pilih Channel",
                  sections: [
                    {
                      title: "Channel Tersimpan",
                      rows
                    }
                  ]
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: m })

  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
break

//==================================//
case "cekidch":
case "idch": {
  if (!text) return m.reply(`Contoh:\n.cekidch https://whatsapp.com/channel/xxxx`)
  if (!text.includes("https://whatsapp.com/channel/"))
    return m.reply("❌ Link channel tidak valid")

  const code = text.split("https://whatsapp.com/channel/")[1].trim()
  const res = await sock.newsletterMetadata("invite", code)

  const teks =
`✅ *CHANNEL DITEMUKAN*

📛 Nama : ${res.name}
🆔 ID   : ${res.id}`

  let msg = await generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: { text: teks },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Channel ID",
                  copy_code: res.id
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🔗 Buka Channel",
                  url: `https://whatsapp.com/channel/${code}`
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: m })

  await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
break

//==================================//

case "jpmch": {
    if (!isOwner) return m.reply(mess.owner)
    if (!text) return m.reply(`*Contoh:* ${cmd} pesannya & bisa dengan foto juga`)
    let mediaPath
    const mimeType = mime
    if (/image/.test(mimeType)) {
        mediaPath = await sock.downloadAndSaveMediaMessage(qmsg)
    }    
    const Channel = await sock.newsletterFetchAllParticipating()
    const channelList = Object.keys(Channel)
    if (!channelList || channelList.length < 1) return m.reply("Channel tidak ditemukan")
    let successCount = 0
    const messageType = mediaPath ? "teks & foto" : "teks"
    const senderChat = m.chat

    const messageContent = mediaPath
        ? { image: await fs.readFileSync(mediaPath), caption: text }
        : { text }
    global.messageJpm = messageContent
    await m.reply(`Memproses JPM ${messageType} ke ${channelList.length} Channel WhatsApp.`)
    for (const chId of channelList) {
        try {
            await sock.sendMessage(chId, global.messageJpm)
            successCount++
        } catch (err) {
            console.error(`Gagal kirim ke channel ${chId}:`, err)
        }
        await sleep(global.JedaJpm)
    }
    if (mediaPath) await fs.unlinkSync(mediaPath)    
    await m.reply(`JPM Channel Telah Selsai ✅\nBerhasil dikirim ke ${successCount} Channel WhatsApp.`)
}
break

//==================================//

case "ping": {
  try {
    const start = process.hrtime.bigint()
    await new Promise(r => setTimeout(r, 10)) // simulasi delay event loop
    const end = process.hrtime.bigint()

    const latency = Number(end - start) / 1e6
    const uptime = typeof runtime === "function"
      ? runtime(process.uptime())
      : `${Math.floor(process.uptime())}s`

    const now = typeof tanggal === "function"
      ? tanggal(Date.now())
      : new Date().toLocaleString()

    const mem = process.memoryUsage()
    const cpu = os.cpus?.()[0]

    const teks =
`📡 *SERVER STATUS*

⏱ Runtime : ${uptime}
⚡ Latency : ${latency.toFixed(2)} ms
🕒 Time    : ${now}

🧠 *MEMORY*
• RSS   : ${(mem.rss / 1024 / 1024).toFixed(2)} MB
• Heap  : ${(mem.heapUsed / 1024 / 1024).toFixed(2)} / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB

⚙️ *SYSTEM*
• CPU   : ${cpu?.model || "N/A"} (${os.cpus()?.length || "?"} cores)
• OS    : ${process.platform} ${process.arch}
• Node  : ${process.version}`

    await m.reply(teks)

  } catch (e) {
    console.error(e)
    m.reply("❌ Gagal cek ping")
  }
}
break

//==================================//

case "kick":
case "kik": {
    if (!m.isGroup) return m.reply(mess.group);
    if (!isOwner && !m.isAdmin) return m.reply(mess.admin);
    if (!m.isBotAdmin) return m.reply(mess.botadmin);
    let target;
    if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0];
    } else if (m.quoted?.sender) {
        target = m.quoted.sender;
    } else if (text) {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) target = cleaned + "@s.whatsapp.net";
    }
    if (!target) return m.reply(`Tag atau input target!\n*Contoh:* ${cmd} @tag/6283XXX`);
    try {
        await sock.groupParticipantsUpdate(m.chat, [target], "remove");
    } catch (err) {
        console.error("Kick error:", err);
        return m.reply("Gagal mengeluarkan anggota. Coba lagi atau cek hak akses bot.");
    }
}
break;

//==================================//

case "pushkontak":
case "puskontak": {
  if (!isOwner) return m.reply(mess.owner);
  if (!text) return m.reply(`*Contoh:* ${cmd} pesannya`)
  global.textpushkontak = text;
  const a = await sock.groupFetchAllParticipating();
  if (!a || !Object.keys(a).length) return m.reply("Tidak ada grup chat.");
  global.dataAllGrup = a;
  const rows = Object.values(a).map(u => ({
    title: u.subject || "Unknown",
    description: `Total Member: ${u.participants.length}`,
    id: `.pushkontak-response ${u.id}`
  }));
  await sock.sendMessage(m.chat, {
    buttons: [{
      buttonId: 'action',
      buttonText: { displayText: 'ini pesan interactiveMeta' },
      type: 4,
      nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title: 'Pilih Target Grup',
          sections: [{ title: 'Pilih Target Grup', rows }]
        })
      }
    }],
    headerType: 1,
    viewOnce: true,
    text: `\nPilih Target Grup Pushkontak\n`
  }, { quoted: m });
}
break;

//==================================//

case "pushkontak-response": {
  if (!isOwner) return m.reply(mess.owner);
  if (!global.textpushkontak || !global.dataAllGrup)
    return m.reply("Data pushkontak tidak ditemukan!\nSilahkan ketik *.pushkontak* pesannya");
  const gc = global.dataAllGrup;
  const teks = global.textpushkontak;
  const data = await gc[text];
  const halls = data.participants
    .map(v => v.jid || v.id)
    .filter(id => id !== botNumber);
  await m.reply(`🚀 Memulai pushkontak ke grup ${data.subject} (${halls.length} member)`);
  const msg = await generateWAMessageFromContent(m.sender, { extendedTextMessage: { text: teks } }, { userJid: m.sender });
  let count = 0;
  for (const mem of halls) {
    await sock.relayMessage(mem, msg.message, { messageId: msg.key.id });
    await global.sleep(global.jedaPushkontak);
    count++;
  }
  delete global.textpushkontak;
  return m.reply(`✅ Pushkontak selesai!\nBerhasil dikirim ke *${count}* member.`);
}
break;

//==================================//

case "jasher":
case "jpm":
case "jaser": {
  if (!isOwner) return m.reply(mess.owner);
  if (!text) return m.reply(`*Contoh:* ${cmd} pesannya & bisa dengan foto juga`);
  let mediaPath;
  if (/image/.test(mime)) {
    mediaPath = await sock.downloadAndSaveMediaMessage(qmsg);
  }
  const allGroups = await sock.groupFetchAllParticipating();
  const groupIds = Object.keys(allGroups);
  let successCount = 0;
  let fail = 0;
  let bl = 0;
  await m.reply(`🚀 *Memproses ${mediaPath ? "Jpm Teks & Foto" : "Jpm Teks"}*
- Total Grup: ${groupIds.length}
- Jeda: ${global.jedaJpm}`);
  for (const id of groupIds) {
    if (db.bljpm.includes(id)) {
    bl += 1
    continue
    }
    try {
      if (mediaPath) {
        await sock.sendMessage(id, {
          image: fs.readFileSync(mediaPath),
          caption: text
        });
      } else {
        await sock.sendMessage(id, { text });
      }
      successCount++;
    } catch (e) {
      fail += 1
      console.error(`Gagal kirim ke grup ${id}:`, e);
    }
    await sleep(global.jedaJpm);
  }
  if (mediaPath) fs.unlinkSync(mediaPath);
  await sock.sendMessage(m.chat, {
    text: `*Jpm ${mediaPath ? "Teks & Foto" : "Teks"} berhasil dikirim ✅*
Berhasil: ${successCount}
Gagal: ${fail}
Blacklist: ${bl}`
  }, { quoted: m });
}
break;

//==================================//

default:
if (m.text.toLowerCase().startsWith("xx ")) {
  if (!isOwner) return;
  try {
    const r = await eval(`(async()=>{${text}})()`);
    sock.sendMessage(m.chat, { text: util.format(typeof r === "string" ? r : util.inspect(r)) }, { quoted: m });
  } catch (e) {
    sock.sendMessage(m.chat, { text: util.format(e) }, { quoted: m });
  }
}

if (m.text.toLowerCase().startsWith("x ")) {
  if (!isOwner) return;
  try {
    let r = await eval(text);
    sock.sendMessage(m.chat, { text: util.format(typeof r === "string" ? r : util.inspect(r)) }, { quoted: m });
  } catch (e) {
    sock.sendMessage(m.chat, { text: util.format(e) }, { quoted: m });
  }
}

if (m.text.startsWith('$ ')) {
  if (!isOwner) return;
  exec(m.text.slice(2), (e, out) =>
    sock.sendMessage(m.chat, { text: util.format(e ? e : out) }, { quoted: m })
  );
}}

//==================================//

} catch (err) {
console.log(err)
}
}

let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.white("• Update"), chalk.white(`${__filename}\n`))
delete require.cache[file]
require(file)
})
