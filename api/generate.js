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


/* ==========================================
   HELPERS
========================================== */

function clean(value, fallback = "") {
    return String(value ?? fallback)
        .replace(/[^\w .:@/+()_-]/g, "")
        .trim()
        .slice(0, 100);
}


function slug(value) {
    return (
        clean(value || "bot")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        || "bot"
    );
}


/* ==========================================
   CASE / FEATURE
========================================== */

function normalizeCaseId(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
}


function getSelectedCases(ids) {
    let result = "";

    for (const id of ids) {

        const file = path.join(
            FEATURES,
            `${id}.js`
        );

        if (!fs.existsSync(file)) {
            console.warn(
                `Case tidak ditemukan: ${id}`
            );

            continue;
        }

        const code = fs.readFileSync(
            file,
            "utf8"
        );

        result += `\n${code}\n`;
    }

    return result;
}


/* ==========================================
   BUILD MESSAGE.JS
========================================== */

function makeMessage(source, ids, prefix) {

    const switchIndex =
        source.indexOf("switch (command)");

    if (switchIndex === -1) {
        throw new Error(
            "switch (command) tidak ditemukan di message.js"
        );
    }


    const openBrace =
        source.indexOf(
            "{",
            switchIndex
        );

    if (openBrace === -1) {
        throw new Error(
            "Pembuka switch tidak ditemukan."
        );
    }


    let depth = 0;
    let switchEnd = -1;


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
                switchEnd = i;
                break;
            }
        }
    }


    if (switchEnd === -1) {
        throw new Error(
            "Penutup switch tidak ditemukan."
        );
    }


    /*
     * Ambil case yang dipilih
     */
    const selected =
        getSelectedCases(ids);


    /*
     * Prefix
     */
    const selectedWithPrefix =
        selected.replace(
            /const\s+prefix\s*=\s*["'][^"']*["']/g,
            `const prefix = ${JSON.stringify(prefix)}`
        );


    /*
     * Default case
     */
    const defaultIndex =
        source.indexOf(
            "default:",
            openBrace
        );


    let defaultCase = "";


    if (
        defaultIndex !== -1 &&
        defaultIndex < switchEnd
    ) {

        defaultCase =
            source.slice(
                defaultIndex,
                switchEnd
            );
    }


    /*
     * Susun message.js baru
     */
    return (
        source.slice(
            0,
            openBrace + 1
        )

        +

        "\n"

        +

        selectedWithPrefix

        +

        "\n"

        +

        defaultCase

        +

        "\n"

        +

        source.slice(
            switchEnd
        )
    );
}


/* ==========================================
   WALK DIRECTORY
========================================== */

function walkDirectory(
    directory,
    relative,
    output
) {

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );


    for (const entry of entries) {

        if (
            entry.name === "node_modules" ||
            entry.name === ".git"
        ) {
            continue;
        }


        const fullPath =
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

            walkDirectory(
                fullPath,
                relativePath,
                output
            );

        } else {

            output.push({
                file: fullPath,
                relative: relativePath
            });

        }
    }
}


/* ==========================================
   GENERATE BOT
========================================== */

module.exports = async (
    req,
    res
) => {

    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error: "Method not allowed"
            });
    }


    try {

        const body =
            req.body || {};


        /*
         * DATA BOT
         */

        const name =
            clean(body.name) ||
            "BOT BARU";


        const author =
            clean(body.author) ||
            "Unknown";


        const category =
            clean(body.category) ||
            "Utility";


        const prefix =
            clean(body.prefix) ||
            ".";


        /*
         * CASE YANG DIPILIH
         */

        const cases = [
            ...new Set(
                (
                    Array.isArray(body.cases)
                        ? body.cases
                        : []
                )
                .map(normalizeCaseId)
                .filter(Boolean)
            )
        ];


        /*
         * NAMA FOLDER
         */

        const folder =
            slug(name);


        /*
         * ZIP
         */

        const archive =
            archiver(
                "zip",
                {
                    zlib: {
                        level: 9
                    }
                }
            );


        res.setHeader(
            "Content-Type",
            "application/zip"
        );


        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${folder}.zip"`
        );


        archive.pipe(res);


        /*
         * AMBIL SEMUA FILE TEMPLATE
         */

        const files = [];

        walkDirectory(
            BASE,
            "",
            files
        );


        /*
         * MASUKKAN FILE KE ZIP
         */

        for (const item of files) {

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

                const source =
                    content.toString(
                        "utf8"
                    );


                const newMessage =
                    makeMessage(
                        source,
                        cases,
                        prefix
                    );


                content =
                    Buffer.from(
                        newMessage,
                        "utf8"
                    );
            }


            /*
             * SETTING.JS
             */

            else if (
                item.relative ===
                "setting.js"
            ) {

                let source =
                    content.toString(
                        "utf8"
                    );


                source =
                    source.replace(
                        /global\.botname\s*=\s*"[^"]*"/,
                        `global.botname = ${JSON.stringify(name)}`
                    );


                /*
                 * Kosongkan owner
                 */
                source =
                    source.replace(
                        /global\.owner\s*=\s*\[.*?\]/s,
                        "global.owner = []"
                    );


                source += `

/*
 * NDZ BOT GENERATOR
 *
 * Pembuat  : ${author}
 * Kategori : ${category}
 * Prefix   : ${prefix}
 */

`;


                content =
                    Buffer.from(
                        source,
                        "utf8"
                    );
            }


            /*
             * PACKAGE.JSON
             */

            else if (
                item.relative ===
                "package.json"
            ) {

                const packageData =
                    JSON.parse(
                        content.toString(
                            "utf8"
                        )
                    );


                packageData.name =
                    folder;


                packageData.description =
                    `${name} - ${category}`;


                content =
                    Buffer.from(
                        JSON.stringify(
                            packageData,
                            null,
                            2
                        ) + "\n",
                        "utf8"
                    );
            }


            /*
             * MASUKKAN KE ZIP
             */

            archive.append(
                content,
                {
                    name:
                        `${folder}/${item.relative}`
                }
            );
        }


        /*
         * INFO GENERATOR
         */

        const info = `# ${name}

Pembuat  : ${author}
Kategori : ${category}
Prefix   : ${prefix}

Case yang dipilih:
${
    cases.length
        ? cases.map(x => `- ${x}`).join("\n")
        : "- Tidak ada"
}
`;


        archive.append(
            info,
            {
                name:
                    `${folder}/GENERATOR-INFO.md`
            }
        );


        /*
         * SELESAI
         */

        await archive.finalize();

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
