const form = document.getElementById("form");
const btn = document.getElementById("btn");
const status = document.getElementById("status");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Disable tombol saat proses berjalan
    btn.disabled = true;
    status.textContent = "⏳ Membuat script...";

    // Ambil platform yang dipilih
    const platform = document.querySelector(
        'input[name="platform"]:checked'
    ).value;

    // Ambil semua data form
    const data = {
        name: document.getElementById("name").value.trim(),
        author: document.getElementById("author").value.trim(),
        category: document.getElementById("category").value,
        platform,
        language: document.getElementById("language").value
    };

    try {
        // Kirim data ke API generator
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        // Cek response API
        if (!response.ok) {
            throw new Error("Gagal membuat project");
        }

        // Ambil hasil ZIP
        const blob = await response.blob();

        // Buat URL sementara untuk file
        const url = URL.createObjectURL(blob);

        // Bersihkan nama file
        const fileName =
            data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "bot-script";

        // Buat tombol download otomatis
        const download = document.createElement("a");

        download.href = url;
        download.download = `${fileName}.zip`;

        document.body.appendChild(download);
        download.click();
        download.remove();

        // Hapus URL sementara
        URL.revokeObjectURL(url);

        // Tampilkan status berhasil
        status.textContent = "✅ Script berhasil dibuat dan diunduh.";

    } catch (error) {
        console.error("Generator Error:", error);

        status.textContent =
            `❌ ${error.message || "Terjadi kesalahan"}`;

    } finally {
        // Aktifkan kembali tombol
        btn.disabled = false;
    }
});
