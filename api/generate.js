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

function walk(dir, relative, result) {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    if (
      item.name === "node_modules" ||
      item.name === ".git" ||
      item.name === "session"
    ) {
      continue;
    }

    const fullPath = path.join(dir, item.name);
    const relativePath = path.join(
      relative,
      item.name
    );

    if (item.isDirectory()) {
      walk(
        fullPath,
        relativePath,
        result
      );
    } else {
      result.push({
        fullPath,
        relativePath
      });
    }
  }
}

function getCases(ids) {
  let result = "";

  for (const id of ids) {
    const safeId = String(id)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (!safeId) continue;

    const file = path.join(
      FEATURES,
      safeId + ".js"
    );

    if (!fs.existsSync(file)) continue;

    result +=
      "\n" +
      fs.readFileSync(file, "utf8") +
      "\n";
  }

  return result;
}

function insertCases(source, ids) {
  const switchIndex =
    source.indexOf("switch(command)");

  if (switchIndex === -1) {
    return source;
  }

  const open =
    source.indexOf("{", switchIndex);

  if (open === -1) {
    return source;
  }

  let depth = 0;
  let close = -1;

  for (
    let i = open;
    i < source.length;
    i++
  ) {
    if (source[i] === "{") {
      depth++;
    }

    if (source[i] === "}") {
      depth--;

      if (depth === 0) {
        close = i;
        break;
      }
    }
  }

  if (close === -1) {
    return source;
  }

  const defaultIndex =
    source.indexOf("default:", open);

  if (
    defaultIndex === -1 ||
    defaultIndex > close
  ) {
    return source;
  }

  return (
    source.slice(0, open + 1) +
    "\n" +
    getCases(ids) +
    "\n" +
    source.slice(
      defaultIndex,
      close
    ) +
    source.slice(close)
  );
}

function makeSetting(data, image) {
  const owner = String(
    data.owner || ""
  )
    .split(/[,\s]+/)
    .map(x => x.replace(/\D/g, ""))
    .filter(Boolean);

  return `module.exports = {
  botname: ${JSON.stringify(data.name)},
  author: ${JSON.stringify(data.author)},
  developer: ${JSON.stringify(data.developer)},
  owner: ${JSON.stringify(owner)},
  pairingNumber: ${JSON.stringify(data.pairingNumber)},
  contact: ${JSON.stringify(data.contact)},
  category: ${JSON.stringify(data.category)},
  prefix: ${JSON.stringify(data.prefix)},
  image: ${JSON.stringify(image)}
};
`;
}

module.exports = async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const name =
      clean(body.name) ||
      "BOT BARU";

    const author =
      clean(body.author) ||
      "DINSTORE";

    const developer =
      clean(body.developer) ||
      author;

    const pairingNumber =
      clean(body.pairingNumber)
        .replace(/\D/g, "");

    const owner =
      clean(body.owner);

    const contact =
      clean(body.contact);

    const category =
      clean(body.category) ||
      "WhatsApp Bot";

    const prefix =
      clean(body.prefix) || ".";

    if (!pairingNumber) {
      return res.status(400).json({
        error:
          "Nomor pairing wajib diisi."
      });
    }

    const ids = [
      ...new Set(
        (
          Array.isArray(body.cases)
            ? body.cases
            : []
        )
          .map(x =>
            String(x)
              .toLowerCase()
              .replace(
                /[^a-z0-9_-]/g,
                ""
              )
          )
          .filter(Boolean)
      )
    ];

    /*
     * FOTO
     */

    let imagePath = "";

    const imageExtensions = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    if (
      body.photo &&
      body.photo.data &&
      imageExtensions[body.photo.type]
    ) {
      const ext =
        imageExtensions[
          body.photo.type
        ];

      imagePath =
        `./media/bot-image.${ext}`;
    }

    const folder = slug(name);

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

    walk(
      BASE,
      "",
      files
    );

    for (const item of files) {
      const fileName =
        path.basename(
          item.relativePath
        );

      /*
       * JANGAN AMBIL SETTING.JS TEMPLATE
       */

      if (
        fileName === "setting.js"
      ) {
        continue;
      }

      let content =
        fs.readFileSync(
          item.fullPath
        );

      /*
       * MESSAGE.JS
       */

      if (
        fileName === "message.js"
      ) {
        content = Buffer.from(
          insertCases(
            content.toString(),
            ids
          )
        );
      }

      /*
       * PACKAGE.JSON
       */

      if (
        fileName === "package.json"
      ) {
        try {
          const pkg =
            JSON.parse(
              content.toString()
            );

          pkg.name = folder;

          pkg.description =
            `${name} - ${category}`;

          content = Buffer.from(
            JSON.stringify(
              pkg,
              null,
              2
            ) + "\n"
          );
        } catch {}
      }

      zip.append(
        content,
        {
          name:
            `${folder}/${item.relativePath}`
        }
      );
    }

    /*
     * BUAT SETTING.JS BARU
     */

    const settingCode =
      makeSetting(
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
      );

    zip.append(
      Buffer.from(settingCode),
      {
        name:
          `${folder}/setting.js`
      }
    );

    /*
     * FOTO BOT
     */

    if (
      body.photo &&
      body.photo.data &&
      imageExtensions[
        body.photo.type
      ]
    ) {
      const ext =
        imageExtensions[
          body.photo.type
        ];

      zip.append(
        Buffer.from(
          body.photo.data,
          "base64"
        ),
        {
          name:
            `${folder}/media/bot-image.${ext}`
        }
      );
    }

    /*
     * INFO
     */

    zip.append(
      `# ${name}

Pembuat: ${author}
Developer: ${developer}
Owner: ${owner || "-"}
Pairing Number: ${pairingNumber}
Kontak Developer: ${contact || "-"}
Kategori: ${category}
Prefix: ${prefix}

Case:
${ids.join(", ") || "Tidak ada"}

Generated by NDZ Bot Generator.
`,
      {
        name:
          `${folder}/GENERATOR-INFO.md`
      }
    );

    await zip.finalize();

  } catch (error) {
    console.error(
      "GENERATOR ERROR:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          error.message ||
          "Gagal membuat bot."
      });
    }
  }
};
