const {
  default: makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

const setting = require("./setting");
const messageHandler = require("./message");

const SESSION_DIR = path.join(__dirname, "session");

const logger = pino({
  level: "silent"
});

const store = makeInMemoryStore({
  logger
});

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function normalizeNumber(number) {
  let value = String(number || "")
    .replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = "62" + value.slice(1);
  }

  if (value.startsWith("62")) {
    return value;
  }

  return value;
}

async function startBot() {
  try {
    fs.mkdirSync(SESSION_DIR, {
      recursive: true
    });

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(
      SESSION_DIR
    );

    const {
      version
    } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,

      auth: state,

      logger,

      printQRInTerminal: false,

      generateHighQualityLinkPreview: true,

      browser: [
        "Ubuntu",
        "Chrome",
        "20.0.04"
      ],

      getMessage: async key => {
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
      }
    });

    store.bind(sock.ev);

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    /*
     * PAIRING
     * Nomor diambil dari setting.js
     * yang dibuat otomatis oleh website.
     */

    if (!state.creds.registered) {
      const pairingNumber =
        normalizeNumber(
          setting.pairingNumber
        );

      if (!pairingNumber) {
        console.log(
          "❌ Nomor pairing belum diatur."
        );

        return;
      }

      console.log(
        "╭─────────────────────────────╮"
      );

      console.log(
        "│       DINSTORE BOT          │"
      );

      console.log(
        "├─────────────────────────────┤"
      );

      console.log(
        "│ Meminta Code Pairing...     │"
      );

      console.log(
        `│ Nomor: ${pairingNumber}`
      );

      console.log(
        "╰─────────────────────────────╯"
      );

      await sleep(6000);

      try {
        const code =
          await sock.requestPairingCode(
            pairingNumber,
            "DINSTORE"
          );

        console.log("");

        console.log(
          "╭─────────────────────────────╮"
        );

        console.log(
          "│       DINSTORE PAIRING      │"
        );

        console.log(
          "├─────────────────────────────┤"
        );

        console.log(
          `│       ${code}               │`
        );

        console.log(
          "╰─────────────────────────────╯"
        );

        console.log("");
        console.log(
          "Masukkan kode tersebut di WhatsApp."
        );

      } catch (error) {
        console.error(
          "❌ Gagal meminta pairing code:",
          error.message
        );
      }
    }

    /*
     * CONNECTION
     */

    sock.ev.on(
      "connection.update",
      async update => {
        const {
          connection,
          lastDisconnect
        } = update;

        if (connection === "connecting") {
          console.log(
            "⏳ Menghubungkan WhatsApp..."
          );
        }

        if (connection === "open") {
          const botNumber =
            sock.user?.id
              ?.split(":")[0]
              ?.split("@")[0] ||
            "Tidak diketahui";

          console.log("");
          console.log(
            "╭─────────────────────────────╮"
          );

          console.log(
            "│       BOT TERHUBUNG         │"
          );

          console.log(
            "├─────────────────────────────┤"
          );

          console.log(
            `│ Nama : ${sock.user?.name || setting.botname || "-"}`
          );

          console.log(
            `│ WA   : ${botNumber}`
          );

          console.log(
            `│ Bot  : ${setting.botname || "-"}`
          );

          console.log(
            "╰─────────────────────────────╯"
          );

          console.log("");
        }

        if (connection === "close") {
          const reason =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          if (
            reason ===
            DisconnectReason.loggedOut
          ) {
            console.log(
              "❌ WhatsApp logout."
            );

            console.log(
              "Hapus folder session lalu jalankan ulang."
            );

            return;
          }

          console.log(
            "⚠️ Koneksi terputus."
          );

          console.log(
            "🔄 Mencoba terhubung kembali..."
          );

          await sleep(3000);

          startBot();
        }
      }
    );

    /*
     * PESAN MASUK
     */

    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {
        for (const m of messages) {
          if (!m?.message) continue;

          try {
            await messageHandler(
              sock,
              m,
              setting
            );
          } catch (error) {
            console.error(
              "❌ Message Handler:",
              error.message
            );
          }
        }
      }
    );

  } catch (error) {
    console.error(
      "❌ Gagal menjalankan bot:",
      error
    );

    await sleep(5000);

    startBot();
  }
}

console.log(
  "╭─────────────────────────────╮"
);

console.log(
  `│ ${setting.botname || "NDZ BOT"}`
);

console.log(
  "│ Generated by NDZ Bot Generator"
);

console.log(
  `│ Developer: ${setting.developer || "-"}`
);

console.log(
  "╰─────────────────────────────╯"
);

startBot();
