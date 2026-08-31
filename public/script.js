const $ = (id) => document.getElementById(id);

let casesData = [];

/*
 * =========================
 * LOAD CASE
 * =========================
 */

async function init() {
  const response = await fetch("/case.json");

  if (!response.ok) {
    throw new Error("case.json tidak ditemukan.");
  }

  casesData = await response.json();

  renderCases(casesData);
}


/*
 * =========================
 * ESCAPE HTML
 * =========================
 */

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}


/*
 * =========================
 * RENDER CASE
 * =========================
 */

function renderCases(list) {
  const container = $("cases");

  if (!list.length) {
    container.innerHTML = `
      <div class="empty">
        📦 Belum ada case / fitur.
      </div>
    `;

    return;
  }

  container.innerHTML = list
    .map((item) => {
      const aliases =
        Array.isArray(item.aliases) && item.aliases.length
          ? ` • alias: ${item.aliases
              .map(escapeHTML)
              .join(", ")}`
          : "";

      return `
        <label
          class="case"
          data-id="${escapeHTML(item.id)}"
          data-name="${escapeHTML(item.name)}"
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
              ${escapeHTML(item.category || "Other")}
              ${aliases}
            </small>

          </div>

        </label>
      `;
    })
    .join("");
}


/*
 * =========================
 * SEARCH CASE
 * =========================
 */

$("search").addEventListener(
  "input",
  (event) => {

    const query =
      event.target.value
        .trim()
        .toLowerCase();

    document
      .querySelectorAll(".case")
      .forEach((item) => {

        const text =
          item.innerText.toLowerCase();

        item.style.display =
          !query || text.includes(query)
            ? "flex"
            : "none";
      });
  }
);


/*
 * =========================
 * PILIH SEMUA
 * =========================
 */

$("all").addEventListener(
  "click",
  () => {

    document
      .querySelectorAll(
        ".case:not([style*='display: none']) input"
      )
      .forEach((checkbox) => {
        checkbox.checked = true;
      });
  }
);


/*
 * =========================
 * KOSONGKAN
 * =========================
 */

$("none").addEventListener(
  "click",
  () => {

    document
      .querySelectorAll(".case input")
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
  }
);


/*
 * =========================
 * PREVIEW FOTO
 * =========================
 */

$("photo").addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {

      event.target.value = "";

      $("photoName").textContent =
        "❌ Format foto harus PNG, JPG, atau WEBP";

      $("previewImage").style.display =
        "none";

      return;
    }

    if (file.size > 3 * 1024 * 1024) {

      event.target.value = "";

      $("photoName").textContent =
        "❌ Foto maksimal 3 MB";

      $("previewImage").style.display =
        "none";

      return;
    }

    $("photoName").textContent =
      `✅ ${file.name}`;

    const url =
      URL.createObjectURL(file);

    $("previewImage").src = url;

    $("previewImage").style.display =
      "block";
  }
);


/*
 * =========================
 * FILE → BASE64
 * =========================
 */

function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = () => {

        const result =
          String(reader.result);

        resolve(
          result.includes(",")
            ? result.split(",")[1]
            : result
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Gagal membaca foto."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}


/*
 * =========================
 * SLUG NAMA FILE
 * =========================
 */

function createSlug(value) {

  return String(value || "bot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "bot";
}


/*
 * =========================
 * CREATE BOT
 * =========================
 */

$("create").addEventListener(
  "click",
  async () => {

    const button =
      $("create");

    const status =
      $("status");

    /*
     * Ambil konfigurasi
     */

    const payload = {
      name: $("name").value.trim(),

      author:
        $("author").value.trim(),

      developer:
        $("developer").value.trim(),

      owner:
        $("owner").value.trim(),

      pairingNumber:
        $("pairingNumber").value.trim(),

      contact:
        $("contact").value.trim(),

      category:
        $("category").value.trim(),

      prefix:
        $("prefix").value.trim(),

      cases: [
        ...document.querySelectorAll(
          ".case input:checked"
        )
      ].map(
        (checkbox) => checkbox.value
      )
    };


    /*
     * VALIDASI
     */

    if (!payload.name) {

      status.textContent =
        "❌ Nama bot wajib diisi.";

      $("name").focus();

      return;
    }

    if (!payload.author) {

      status.textContent =
        "❌ Nama pembuat wajib diisi.";

      $("author").focus();

      return;
    }

    if (!payload.pairingNumber) {

      status.textContent =
        "❌ Nomor pairing wajib diisi.";

      $("pairingNumber").focus();

      return;
    }


    /*
     * Validasi nomor
     */

    const pairing =
      payload.pairingNumber
        .replace(/\D/g, "");

    if (pairing.length < 10) {

      status.textContent =
        "❌ Nomor pairing tidak valid.";

      $("pairingNumber").focus();

      return;
    }


    /*
     * Foto
     */

    const photo =
      $("photo").files[0];

    if (photo) {

      if (photo.size > 3 * 1024 * 1024) {

        status.textContent =
          "❌ Foto maksimal 3 MB.";

        return;
      }

      payload.photo = {
        name: photo.name,
        type: photo.type,
        data: await fileToBase64(photo)
      };
    }


    /*
     * CREATE
     */

    button.disabled = true;

    status.textContent =
      `⏳ Membuat bot dengan ${payload.cases.length} case...`;


    try {

      const response =
        await fetch(
          "/api/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(payload)
          }
        );


      /*
       * Error dari API
       */

      if (!response.ok) {

        let message =
          "Gagal membuat bot.";

        try {

          const error =
            await response.json();

          message =
            error.error ||
            message;

        } catch {}

        throw new Error(message);
      }


      /*
       * Download ZIP
       */

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${createSlug(payload.name)}.zip`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );


      /*
       * SUCCESS
       */

      status.textContent =
        `✅ Bot berhasil dibuat! ${payload.cases.length} case dimasukkan.`;

    } catch (error) {

      console.error(error);

      status.textContent =
        `❌ ${error.message || "Gagal membuat bot."}`;

    } finally {

      button.disabled = false;
    }
  }
);


/*
 * =========================
 * START
 * =========================
 */

init().catch((error) => {

  console.error(error);

  $("cases").innerHTML = `
    <div class="empty">
      ❌ Gagal memuat case.
    </div>
  `;

  $("status").textContent =
    `❌ ${error.message}`;
});
