const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeInMemoryStore
} = require("baileys");

const pino = require("pino");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

const setting = require("./setting");

const sessionPath = path.join(__dirname, "session");

async function startBot() {
  /*
   * STORE
   */
  const store = makeInMemoryStore({
    logger: pino().child({
      level: "silent",
      stream: "store"
    })
  });

  /*
   * AUTH
   */
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(sessionPath);

  /*
   * BAILEYS VERSION
   */
  const { version } =
    await fetchLatestBaileysVersion();

  /*
   * SOCKET
   */
  const sock = makeWASocket({
    version,

    auth: state,

    printQRInTerminal: false,

    logger: pino({
      level: "silent"
    }),

    generateHighQualityLinkPreview: true,

    browser: [
      setting.botname || "Ubuntu",
      "Chrome",
      "20.0.04"
    ],

    getMessage: async key => {
      if (!store) return undefined;

      try {
        const msg =
          await store.loadMessage(
            key.remoteJid,
            key.id
          );

        return msg?.message || undefined;

      } catch {
        return undefined;
      }
    },

    cachedGroupMetadata: async jid => {
      if (!global.groupMetadataCache) {
        global.groupMetadataCache = new Map();
      }

      if (
        !global.groupMetadataCache.has(jid)
      ) {
        try {
          const metadata =
            await sock.groupMetadata(jid);

          global.groupMetadataCache.set(
            jid,
            metadata
          );

          return metadata;

        } catch {
          return undefined;
        }
      }

      return global.groupMetadataCache.get(jid);
    }
  });

  /*
   * PAIRING CODE
   */
  if (!sock.authState.creds.registered) {

    const pairingNumber = String(
      setting.pairingNumber || ""
    )
      .replace(/\D/g, "")
      .replace(/^0/, "62");

    if (!pairingNumber) {
      console.log(
        chalk.red(
          "❌ Nomor pairing belum diatur."
        )
      );

      return;
    }

    console.log(
      chalk.white(
        "• Script By " +
        (setting.developer || setting.author || "-")
      )
    );

    console.log(
      chalk.white(
        "• Pembuat: " +
        (setting.author || "-")
      )
    );

    console.log(
      chalk.white(
        "• Meminta Code Pair..."
      )
    );

    setTimeout(async () => {

      try {

        const code =
          await sock.requestPairingCode(
            pairingNumber,
            "DINSTORE"
          );

        console.log(
          chalk.white(
            `• Kode Pairing: ${code}`
          )
        );

      } catch (error) {

        console.log(
          chalk.red(
            "❌ Gagal meminta pairing code:"
          )
        );

        console.log(
          chalk.red(
            error.message
          )
        );

      }

    }, 6000);
  }

  /*
   * SAVE AUTH
   */
  sock.ev.on(
    "creds.update",
    saveCreds
  );

  /*
   * STORE
   */
  store.bind(
    sock.ev
  );

  /*
   * CONNECTION
   */
  sock.ev.on(
    "connection.update",
    ({ connection, lastDisconnect }) => {

      if (connection === "close") {

        const reason =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;

        if (
          reason !==
          DisconnectReason.loggedOut
        ) {

          console.log(
            chalk.yellow(
              "• Koneksi terputus, reconnect..."
            )
          );

          setTimeout(
            startBot,
            3000
          );

        } else {

          console.log(
            chalk.red(
              "• Device Logged out."
            )
          );

          console.log(
            chalk.white(
              "• Hapus folder /session untuk login ulang."
            )
          );
        }

      }

      else if (connection === "open") {

        const botNumber =
          sock.user.id
            .split(":")[0] +
          "@s.whatsapp.net";

        console.log("");

        console.log(
          chalk.green(
            "• Bot Berhasil Tersambung"
          )
        );

        console.log(
          chalk.white(
            `• Nama: ${
              sock?.user?.name ||
              setting.botname ||
              "Tidak terdeteksi"
            }`
          )
        );

        console.log(
          chalk.white(
            `• WhatsApp: ${
              botNumber.split("@")[0]
            }`
          )
        );

        console.log("");
      }
    }
  );

  /*
   * MESSAGE HANDLER
   */
  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

      const handler =
        require("./message");

      for (const m of messages) {

        if (!m.message) {
          continue;
        }

        try {

          await handler(
            sock,
            m,
            setting
          );

        } catch (error) {

          console.error(
            "MESSAGE ERROR:",
            error
          );

        }
      }
    }
  );
}

startBot().catch(error => {
  console.error(
    "BOT ERROR:",
    error
  );
});
