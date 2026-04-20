export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { images, category, title, comment, password } = req.body;

    // 🔐 Passwort prüfen
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Falsches Passwort" });
    }

    // 📦 Validierung
    if (!images || images.length === 0 || !title) {
        return res.status(400).json({ message: "Fehlende Daten" });
    }

    // 📁 Kategorien
    const fileMap = {
        trikots: "trikots.json",
        spiele: "spiele.json",
        garageAktuell: "garageAktuell.json",
        garageAlt: "garageAlt.json"
    };

    const fileName = fileMap[category];

    if (!fileName) {
        return res.status(400).json({ message: "Ungültige Kategorie" });
    }

    // 🔑 ENV Variablen
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "BelliTim/Public"; // ✅ HIER ANPASSEN falls anders

    const path = `content/${fileName}`;

    try {

        // 📥 Datei laden
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        let data = [];
        let sha = null;

        if (getRes.status === 200) {
            const fileData = await getRes.json();
            sha = fileData.sha;

            const content = JSON.parse(
                Buffer.from(fileData.content, "base64").toString()
            );

            data = Array.isArray(content) ? content : [];
        }

        // ➕ neuen Eintrag oben hinzufügen
        data.unshift({
            title,
            comment,
            images
        });

        const updated = Buffer.from(
            JSON.stringify(data, null, 2)
        ).toString("base64");

        // 📤 speichern
        const updateRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Neuer Eintrag",
                content: updated,
                sha
            })
        });

        if (updateRes.status !== 200 && updateRes.status !== 201) {
            return res.status(500).json({ message: "Fehler beim Speichern" });
        }

        return res.status(200).json({ message: "Upload erfolgreich 🚀" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
