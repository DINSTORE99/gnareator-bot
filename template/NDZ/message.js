module.exports = async function (sock, m, setting) {
  const msg = m.message || {};

  const text =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    "";

  const prefix = setting.prefix || "";
  const command = text
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(prefix, "");

  switch (command) {

    // CASE DARI WEBSITE AKAN DIMASUKKAN DI SINI

    default:
      break;
  }
};
