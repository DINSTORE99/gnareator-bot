const chalk = require("chalk");
const fs = require("fs");

if (!global.db) global.db = {}

if (!global.db.autopromo) {
  global.db.autopromo = {
    on: false,
    text: "",
    image: null,
    interval: 6 * 60 * 60 * 1000, // 6 jam
    lastRun: 0
  }
}
global.cfToken = ""
global.cfZoneId = ""
global.cfDomain  = "dinn.my.id"

global.githubToken = ""
global.githubOwner = "DIN-STORE"
global.githubRepo = "izin"
global.githubFile = "ip"

global.pairingNumber = ""
global.owner = []

global.idSaluran = "120363363871493245@newsletter";

global.jedaPushkontak = 5000
global.jedaJpm = 4000
global.botname = "DIN-BOTZ"
global.telegram = "https://wa.me/+6287776581216"
global.linkgroup = "https://t.me/DINN_STORE"

global.dana = ""
global.seabank = ""
global.gopay = ""
global.qris = ""

let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.white("Update New"), chalk.white(`${__filename}\n`))
delete require.cache[file]
require(file)
})
