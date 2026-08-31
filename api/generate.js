const archiver = require("archiver");

function safe(v, fallback="Bot Script"){
  return String(v || fallback).replace(/[^\w .-]/g,"").trim().slice(0,80) || fallback;
}
function slug(v){
  return safe(v,"bot-script").toLowerCase().replace(/\s+/g,"-");
}
function files(data){
  const name=safe(data.name), author=safe(data.author,"Unknown"), cat=safe(data.category,"Utility");
  if(data.platform==="telegram"){
    return {
      "index.js":`const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply("🤖 ${name} aktif!"));
bot.command("menu", (ctx) => ctx.reply("📋 Menu ${name}\\n\\n/start - Start bot\\n/menu - Menu"));
bot.on("text", (ctx) => ctx.reply("Pesan diterima: " + ctx.message.text));

bot.launch();
console.log("${name} started.");
process.once("SIGINT",()=>bot.stop("SIGINT"));
process.once("SIGTERM",()=>bot.stop("SIGTERM"));
`,
      "package.json":JSON.stringify({name:slug(name),version:"1.0.0",main:"index.js",scripts:{start:"node index.js"},dependencies:{telegraf:"latest"}},null,2),
      ".env.example":"BOT_TOKEN=ISI_TOKEN_BOT_TELEGRAM_DI_SINI\n",
      "README.md":`# ${name}

Pembuat: ${author}
Kategori: ${cat}
Platform: Telegram
Bahasa: Node.js

## Install
npm install

## Konfigurasi
Salin .env.example menjadi .env lalu isi BOT_TOKEN.

## Jalankan
npm start
`
    };
  }
  return {
    "index.js":`const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@yudzxml/baileys");

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if(connection === "open") console.log("🤖 ${name} connected!");
    if(connection === "close"){
      const code = lastDisconnect?.error?.output?.statusCode;
      if(code !== DisconnectReason.loggedOut) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if(!m?.message || m.key.fromMe) return;
    const jid=m.key.remoteJid;
    const text=m.message.conversation || m.message.extendedTextMessage?.text || "";
    if(text.toLowerCase()===".menu")
      await sock.sendMessage(jid,{text:"🤖 ${name}\\n\\n/menu - Menu\\n/ping - Ping"});
    if(text.toLowerCase()===".ping")
      await sock.sendMessage(jid,{text:"pong 🏓"});
  });
}
startBot();
`,
    "package.json":JSON.stringify({name:slug(name),version:"1.0.0",main:"index.js",scripts:{start:"node index.js"},dependencies:{"@yudzxml/baileys":"latest"}},null,2),
    ".gitignore":"node_modules/\nsession/\n.env\n",
    ".env.example":"# Tambahkan konfigurasi rahasia bot di sini jika diperlukan\n",
    "README.md":`# ${name}

Pembuat: ${author}
Kategori: ${cat}
Platform: WhatsApp
Bahasa: Node.js

Template menggunakan @yudzxml/baileys.

## Install
npm install

## Jalankan
npm start

Session akan dibuat otomatis di folder session/.
`
  };
}

module.exports=async(req,res)=>{
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 try{
  const body=req.body || {};
  if(!body.name || !body.author) return res.status(400).json({error:"Nama bot dan pembuat wajib diisi"});
  const archive=archiver("zip",{zlib:{level:9}});
  res.setHeader("Content-Type","application/zip");
  res.setHeader("Content-Disposition",`attachment; filename="${slug(body.name)}.zip"`);
  archive.pipe(res);
  for(const [path,content] of Object.entries(files(body))) archive.append(content,{name:`${slug(body.name)}/${path}`});
  await archive.finalize();
 }catch(e){console.error(e); if(!res.headersSent) res.status(500).json({error:"Gagal membuat ZIP"})}
};
