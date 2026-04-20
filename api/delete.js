export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { type, index, password } = req.body;

    // 🔐 Passwort prüfen
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Kein Zugriff" });
    }

    // 📁 erlaubte Kategorien
    const fileMap = {
        trikots: "trikots.json",
        spiele: "spiele.json",
        garageAktuell: "garageAktuell.json",
        garageAlt: "garageAlt.json"
    };

    const fileName = fileMap[type];

    if (!fileName) {
        return res.status(400).json({ message: "Ungültige Kategorie" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = process.env.GITHUB_REPO;

    const path = `content/${fileName}`;

    try {

        // 📥 Datei laden
        const fileRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        if (fileRes.status !== 200) {
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await fileRes.json();

        const content = JSON.parse(
            Buffer.from(fileData.content, "base64").toString()
        );

        // 🧠 Sicherheit
        if (!Array.isArray(content) || !content[index]) {
            return res.status(400).json({ message: "Eintrag nicht gefunden" });
        }

        // ❌ löschen
        content.splice(index, 1);

        const updated = Buffer.from(
            JSON.stringify(content, null, 2)
        ).toString("base64");

        // 📤 speichern
        const updateRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Eintrag gelöscht",
                content: updated,
                sha: fileData.sha
            })
        });

        if (updateRes.status !== 200 && updateRes.status !== 201) {
            return res.status(500).json({ message: "Fehler beim Speichern" });
        }

        return res.status(200).json({ message: "Gelöscht 🗑️" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
