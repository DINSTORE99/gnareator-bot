const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = process.cwd();
const BASE = path.join(ROOT, "template", "NDZ");
const FEATURES = path.join(ROOT, "fitur");

function clean(value, fallback = "") {
  return String(value ?? fallback)
    .trim()
    .slice(0, 150);
}

function slug(value) {
  return (
    clean(value, "bot")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "bot"
  );
}

function walk(dir, rel, output) {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ["node_modules", ".git", "session"].includes(item.name)
    ) {
      continue;
    }

    const full = path.join(dir, item.name);
    const relative = path.join(rel, item.name);

    if (item.isDirectory()) {
      walk(full, relative, output);
    } else {
      output.push({
        file: full,
        relative
      });
    }
  }
}

function getFeatures(ids) {
  let result = "";

  for (const id of ids) {
    const safeId = String(id)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (!safeId) continue;

    const file = path.join(FEATURES, `${safeId}.js`);

    if (fs.existsSync(file)) {
      result += "\n" + fs.readFileSync(file, "utf8") + "\n";
    }
  }

  return result;
}

function insertCases(source, ids) {
  const switchStart = source.indexOf("switch(command)");

  if (switchStart === -1) {
    return source;
  }

  const openBrace = source.indexOf("{", switchStart);

  if (openBrace === -1) {
    return source;
  }

  let depth = 0;
  let closeBrace = -1;

  for (let i = openBrace; i < source.length; i++) {
    if (source[i] === "{") {
      depth++;
    }

    if (source[i] === "}") {
      depth--;

      if (depth === 0) {
        closeBrace = i;
        break;
      }
    }
  }

  if (closeBrace === -1) {
    return source;
  }

  const defaultPos = source.indexOf(
    "default:",
    openBrace
  );

  if (defaultPos === -1 || defaultPos > closeBrace) {
    return source;
  }

  const cases = getFeatures(ids);

  return (
    source.slice(0, openBrace + 1) +
    "\n" +
    cases +
    "\n" +
    source.slice(defaultPos, closeBrace) +
    source.slice(closeBrace)
  );
}

function createSetting(data, imagePath) {
  const owner = data.owner
    ? String(data.owner)
        .split(/[,\s]+/)
        .map(x => x.replace(/\D/g, ""))
        .filter(Boolean)
    : [];

  return `module.exports = {
  botname: ${JSON.stringify(data.name)},
  author: ${JSON.stringify(data.author)},
  developer: ${JSON.stringify(data.developer)},
  owner: ${JSON.stringify(owner)},
  pairingNumber: ${JSON.stringify(data.pairingNumber)},
  contact: ${JSON.stringify(data.contact)},
  category: ${JSON.stringify(data.category)},
  prefix: ${JSON.stringify(data.prefix)},
  image: ${JSON.stringify(imagePath)}
};
`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const name = clean(body.name, "BOT BARU");
    const author = clean(body.author, "Unknown");
    const developer = clean(
      body.developer,
      author
    );

    const pairingNumber = clean(
      body.pairingNumber
    ).replace(/\D/g, "");

    const owner = clean(body.owner);
    const contact = clean(body.contact);

    const category = clean(
      body.category,
      "WhatsApp Bot"
    );

    const prefix =
      clean(body.prefix, ".") || ".";

    if (!pairingNumber) {
      return res.status(400).json({
        error: "Nomor pairing wajib diisi."
      });
    }

    const cases = [
      ...new Set(
        Array.isArray(body.cases)
          ? body.cases
              .map(x =>
                String(x)
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, "")
              )
              .filter(Boolean)
          : []
      )
    ];

    const folder = slug(name);

    const photo = body.photo;

    let imagePath = "";

    if (
      photo &&
      photo.data &&
      photo.type
    ) {
      const allowed = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp"
      };

      const ext = allowed[photo.type];

      if (ext) {
        imagePath = `./media/bot-image.${ext}`;
      }
    }

    const zip = archiver("zip", {
      zlib: {
        level: 9
      }
    });

    res.setHeader(
      "Content-Type",
      "application/zip"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folder}.zip"`
    );

    zip.pipe(res);

    const files = [];

    walk(BASE, "", files);

    for (const item of files) {
      let content = fs.readFileSync(
        item.file
      );

      /*
       * MESSAGE.JS
       * Case yang dicentang di website
       * dimasukkan otomatis.
       */
      if (item.relative === "message.js") {
        content = Buffer.from(
          insertCases(
            content.toString(),
            cases
          )
        );
      }

      /*
       * SETTING.JS
       * Dibuat ulang berdasarkan form website.
       */
      if (item.relative === "setting.js") {
        content = Buffer.from(
          createSetting(
            {
              name,
              author,
              developer,
              owner,
              pairingNumber,
              contact,
              category,
              prefix
            },
            imagePath
          )
        );
      }

      /*
       * PACKAGE.JSON
       */
      if (item.relative === "package.json") {
        try {
          const pkg = JSON.parse(
            content.toString()
          );

          pkg.name = folder;
          pkg.description =
            `${name} - ${category}`;

          content = Buffer.from(
            JSON.stringify(pkg, null, 2) +
              "\n"
          );
        } catch {}
      }

      zip.append(content, {
        name: `${folder}/${item.relative}`
      });
    }

    /*
     * FOTO BOT
     */
    if (
      photo &&
      photo.data &&
      photo.type
    ) {
      const allowed = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp"
      };

      const ext = allowed[photo.type];

      if (ext) {
        const imageBuffer = Buffer.from(
          photo.data,
          "base64"
        );

        zip.append(imageBuffer, {
          name:
            `${folder}/media/bot-image.${ext}`
        });
      }
    }

    /*
     * INFO GENERATOR
     */
    zip.append(
      `# ${name}

Pembuat: ${author}
Developer: ${developer}
Kategori: ${category}
Prefix: ${prefix}
Owner: ${owner || "-"}
Pairing Number: ${pairingNumber}
Kontak Developer: ${contact || "-"}
Case: ${cases.join(", ") || "Tidak ada"}

Generated by NDZ Bot Generator.
`,
      {
        name:
          `${folder}/GENERATOR-INFO.md`
      }
    );

    await zip.finalize();

  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          error.message ||
          "Gagal membuat bot."
      });
    }
  }
};
