const box = document.getElementById("cases");
const status = document.getElementById("status");

const searchInput = document.getElementById("search");
const selectAllButton = document.getElementById("all");
const clearButton = document.getElementById("none");
const createButton = document.getElementById("create");

let caseData = [];


/* ==========================================
   LOAD CASE
========================================== */

async function init() {
    try {
        const response = await fetch("/case.json");

        if (!response.ok) {
            throw new Error("case.json tidak ditemukan.");
        }

        caseData = await response.json();

        renderCases(caseData);
        updateSelectedCount();

    } catch (error) {
        console.error(error);

        status.textContent = "❌ Gagal memuat daftar case.";
    }
}


/* ==========================================
   RENDER CASE
========================================== */

function renderCases(list) {

    if (!list.length) {
        box.innerHTML = `
            <div class="empty">
                Tidak ada case yang tersedia.
            </div>
        `;

        return;
    }

    box.innerHTML = list.map(item => {

        const aliases = Array.isArray(item.aliases)
            ? item.aliases
            : [];

        return `
            <label
                class="case"
                data-id="${escapeHTML(item.id)}"
            >

                <input
                    type="checkbox"
                    value="${escapeHTML(item.id)}"
                >

                <div class="case-info">

                    <strong>
                        .${escapeHTML(item.name)}
                    </strong>

                    <small>
                        ${escapeHTML(item.category)}

                        ${
                            aliases.length
                                ? ` • alias: ${aliases
                                    .map(escapeHTML)
                                    .join(", ")}`
                                : ""
                        }
                    </small>

                </div>

            </label>
        `;

    }).join("");

    updateSelectedCount();
}


/* ==========================================
   SEARCH CASE
========================================== */

searchInput.addEventListener("input", event => {

    const query = event.target.value
        .toLowerCase()
        .trim();

    document.querySelectorAll(".case").forEach(item => {

        const id = item.dataset.id.toLowerCase();

        item.classList.toggle(
            "hidden",
            query !== "" && !id.includes(query)
        );

    });

});


/* ==========================================
   PILIH SEMUA
========================================== */

selectAllButton.addEventListener("click", () => {

    document
        .querySelectorAll(".case:not(.hidden) input")
        .forEach(input => {
            input.checked = true;
        });

    updateSelectedCount();
});


/* ==========================================
   KOSONGKAN
========================================== */

clearButton.addEventListener("click", () => {

    document
        .querySelectorAll(".case input")
        .forEach(input => {
            input.checked = false;
        });

    updateSelectedCount();
});


/* ==========================================
   UPDATE JUMLAH CASE
========================================== */

box.addEventListener("change", event => {

    if (event.target.type === "checkbox") {
        updateSelectedCount();
    }

});


function updateSelectedCount() {

    const total = document.querySelectorAll(
        ".case input:checked"
    ).length;

    const text = total === 0
        ? "Belum ada case dipilih."
        : `${total} case dipilih.`;

    status.dataset.selected = text;
}


/* ==========================================
   CREATE BOT
========================================== */

createButton.addEventListener("click", async () => {

    const name = document
        .getElementById("name")
        .value
        .trim();

    const author = document
        .getElementById("author")
        .value
        .trim();

    const category = document
        .getElementById("category")
        .value;

    const prefix =
        document
            .getElementById("prefix")
            .value
            .trim() || ".";


    /* VALIDASI */

    if (!name) {
        status.textContent = "❌ Nama bot wajib diisi.";
        return;
    }

    if (!author) {
        status.textContent = "❌ Nama pembuat wajib diisi.";
        return;
    }


    /* AMBIL CASE */

    const selectedCases = [
        ...document.querySelectorAll(
            ".case input:checked"
        )
    ].map(input => input.value);


    /* PAYLOAD */

    const payload = {
        name,
        author,
        category,
        prefix,
        cases: selectedCases
    };


    /* LOADING */

    createButton.disabled = true;

    createButton.textContent =
        "⏳ SEDANG MEMBUAT BOT...";

    status.textContent =
        `Membuat bot dengan ${selectedCases.length} case...`;


    try {

        const response = await fetch(
            "/api/generate",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)
            }
        );


        /* CEK ERROR */

        if (!response.ok) {

            let message =
                "Gagal membuat bot.";

            try {

                const error =
                    await response.json();

                message =
                    error.error || message;

            } catch (_) {}

            throw new Error(message);
        }


        /* DOWNLOAD ZIP */

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(blob);


        const safeName =
            name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                || "bot";


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${safeName}.zip`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        status.textContent =
            `✅ Bot berhasil dibuat dengan ${selectedCases.length} case.`;

    } catch (error) {

        console.error(error);

        status.textContent =
            `❌ ${error.message}`;

    } finally {

        createButton.disabled = false;

        createButton.textContent =
            "🚀 CREATE BOT & DOWNLOAD";

    }

});


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================
   START
========================================== */

init();
