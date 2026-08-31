const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = process.cwd();

const BASE = path.join(
  ROOT,
  "template",
  "NDZ"
);

const FEATURES = path.join(
  ROOT,
  "fitur"
);


/*
 * =========================
 * SANITIZE
 * =========================
 */

function clean(value) {
  return String(value ?? "")
    .replace(/[^\w .:@/+()_-]/g, "")
    .trim()
    .slice(0, 100);
}


function slug(value) {
  return (
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) ||
    "bot"
  );
}


/*
 * =========================
 * WALK TEMPLATE
 * =========================
 */

function walk(directory, relative, output) {

  if (!fs.existsSync(directory)) {
    return;
  }

  for (
    const entry of fs.readdirSync(
      directory,
      {
        withFileTypes: true
      }
    )
  ) {

    /*
     * Jangan masukkan folder session,
     * node_modules atau git.
     */

    if (
      [
        "node_modules",
        ".git",
        "session"
      ].includes(entry.name)
    ) {
      continue;
    }

    const filePath =
      path.join(
        directory,
        entry.name
      );

    const relativePath =
      path.join(
        relative,
        entry.name
      );

    if (entry.isDirectory()) {

      walk(
        filePath,
        relativePath,
        output
      );

    } else {

      output.push({
        file: filePath,
        relative: relativePath
      });

    }
  }
}


/*
 * =========================
 * LOAD FEATURE
 * =========================
 */

function getFeatures(ids) {

  let result = "";

  for (const id of ids) {

    const safeId = String(id)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (!safeId) {
      continue;
    }

    const filePath =
      path.join(
        FEATURES,
        `${safeId}.js`
      );

    if (!fs.existsSync(filePath)) {
      continue;
    }

    result +=
      "\n" +
      fs.readFileSync(
        filePath,
        "utf8"
      ) +
      "\n";
  }

  return result;
}


/*
 * =========================
 * INSERT CASE
 * =========================
 */

function buildMessage(
  source,
  ids
) {

  const switchIndex =
    source.indexOf(
      "switch (command)"
    ) !== -1
      ? source.indexOf(
          "switch (command)"
        )
      : source.indexOf(
          "switch(command)"
        );

  /*
   * Kalau template belum punya switch,
   * jangan rusak file.
   */

  if (switchIndex === -1) {
    return source;
  }

  const openBrace =
    source.indexOf(
      "{",
      switchIndex
    );

  if (openBrace === -1) {
    return source;
  }

  let depth = 0;
  let endBrace = -1;

  for (
    let i = openBrace;
    i < source.length;
    i++
  ) {

    if (source[i] === "{") {
      depth++;
    }

    if (source[i] === "}") {

      depth--;

      if (depth === 0) {
        endBrace = i;
        break;
      }
    }
  }

  if (endBrace === -1) {
    return source;
  }

  const defaultIndex =
    source.indexOf(
      "default:",
      openBrace
    );

  if (defaultIndex === -1) {
    return source;
  }

  const selected =
    getFeatures(ids);

  return (
    source.slice(
      0,
      openBrace + 1
    ) +

    "\n" +

    selected +

    "\n" +

    source.slice(
      defaultIndex,
      endBrace
    ) +

    "\n" +

    source.slice(
      endBrace
    )
  );
}


/*
 * =========================
 * PHOTO EXTENSION
 * =========================
 */

function getImageExtension(type) {

  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };

  return extensions[type] || null;
}


/*
 * =========================
 * GENERATE SETTING
 * =========================
 */

function createSetting(body) {

  const owner = body.owner
    ? [
        clean(body.owner)
      ]
    : [];

  const photoExtension =
    body.photo
      ? getImageExtension(
          body.photo.type
        )
      : null;

  const image =
    photoExtension
      ? `./media/bot-image.${photoExtension}`
      : "";

  return `module.exports = {
  botname: ${JSON.stringify(
    clean(body.name)
  )},

  author: ${JSON.stringify(
    clean(body.author)
  )},

  developer: ${JSON.stringify(
    clean(body.developer)
  )},

  owner: ${JSON.stringify(
    owner
  )},

  pairingNumber: ${JSON.stringify(
    clean(body.pairingNumber)
  )},

  contact: ${JSON.stringify(
    clean(body.contact)
  )},

  category: ${JSON.stringify(
    clean(body.category)
  )},

  prefix: ${JSON.stringify(
    clean(body.prefix)
  )},

  image: ${JSON.stringify(
    image
  )}
};
`;
}


/*
 * =========================
 * API
 * =========================
 */

module.exports = async function (
  req,
  res
) {

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error:
          "Method not allowed"
      });
  }


  try {

    const body =
      req.body || {};


    /*
     * =====================
     * DATA WEBSITE
     * =====================
     */

    const name =
      clean(body.name);

    const author =
      clean(body.author);

    const developer =
      clean(body.developer);

    const pairingNumber =
      clean(
        body.pairingNumber
      );


    /*
     * =====================
     * VALIDASI
     * =====================
     */

    if (!name) {

      throw new Error(
        "Nama bot wajib diisi."
      );
    }

    if (!author) {

      throw new Error(
        "Nama pembuat wajib diisi."
      );
    }

    if (!pairingNumber) {

      throw new Error(
        "Nomor pairing wajib diisi."
      );
    }


    /*
     * =====================
     * CASE
     * =====================
     */

    const cases =
      Array.isArray(body.cases)
        ? [
            ...new Set(
              body.cases
                .map(
                  value =>
                    String(value)
                      .toLowerCase()
                      .replace(
                        /[^a-z0-9_-]/g,
                        ""
                      )
                )
                .filter(Boolean)
            )
          ]
        : [];


    /*
     * =====================
     * ZIP
     * =====================
     */

    const folder =
      slug(name);

    const zip =
      archiver("zip", {
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


    /*
     * =====================
     * TEMPLATE FILES
     * =====================
     */

    const files = [];

    walk(
      BASE,
      "",
      files
    );


    for (
      const item of files
    ) {

      let content =
        fs.readFileSync(
          item.file
        );


      /*
       * MESSAGE.JS
       */

      if (
        item.relative ===
        "message.js"
      ) {

        content =
          Buffer.from(
            buildMessage(
              content.toString(),
              cases
            )
          );
      }


      /*
       * SETTING.JS
       */

      if (
        item.relative ===
        "setting.js"
      ) {

        content =
          Buffer.from(
            createSetting(
              body
            )
          );
      }


      /*
       * PACKAGE.JSON
       */

      if (
        item.relative ===
        "package.json"
      ) {

        try {

          const packageData =
            JSON.parse(
              content.toString()
            );

          packageData.name =
            folder;

          packageData.description =
            `${name} - ${
              clean(
                body.category
              )
            }`;

          content =
            Buffer.from(
              JSON.stringify(
                packageData,
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
            `${folder}/${item.relative}`
        }
      );
    }


    /*
     * =====================
     * FOTO BOT
     * =====================
     */

    if (
      body.photo &&
      body.photo.data &&
      body.photo.type
    ) {

      const extension =
        getImageExtension(
          body.photo.type
        );

      if (extension) {

        const imageBuffer =
          Buffer.from(
            body.photo.data,
            "base64"
          );

        zip.append(
          imageBuffer,
          {
            name:
              `${folder}/media/bot-image.${extension}`
          }
        );
      }
    }


    /*
     * =====================
     * INFO GENERATOR
     * =====================
     */

    zip.append(
      `# ${name}

Pembuat: ${author}
Developer: ${developer}
Kategori: ${clean(body.category)}
Prefix: ${clean(body.prefix)}
Case: ${
        cases.length
          ? cases.join(", ")
          : "Tidak ada"
      }

Generated by DIN STORE.
`,
      {
        name:
          `${folder}/GENERATOR-INFO.md`
      }
    );


    /*
     * =====================
     * FINALIZE
     * =====================
     */

    await zip.finalize();

  } catch (error) {

    console.error(
      "GENERATOR ERROR:",
      error
    );

    if (!res.headersSent) {

      return res
        .status(500)
        .json({
          error:
            error.message ||
            "Gagal membuat bot."
        });
    }
  }
};
