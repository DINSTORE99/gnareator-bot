case "menu":
case "help": {
  const prefix = setting.prefix || ".";

  const menuItems = [
    "menu",
    "ping",
    "rvo",
    "download"
  ];

  const commands = menuItems
    .map(command => `• ${prefix}${command}`)
    .join("\n");

  const text = `
╭━━〔 ⚡ ${setting.botname || "BOT"} 〕━━╮
┃ 👨‍💻 Developer: ${setting.developer || "-"}
╰━━━━━━━━━━━━━━━━━━╯

📦 MENU

${commands}

> ${setting.developer || "Developer"}
`.trim();

  const message = {
    caption: text
  };

  if (setting.image) {
    message.image = {
      url: setting.image
    };
  }

  await sock.sendMessage(
    m.key.remoteJid,
    message,
    {
      quoted: m
    }
  );
}

break;
