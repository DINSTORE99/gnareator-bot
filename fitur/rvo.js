case "rvo": {
  await sock.sendMessage(
    m.key.remoteJid,
    {
      text: "Fitur RVO siap dikembangkan."
    },
    {
      quoted: m
    }
  );
}

break;
