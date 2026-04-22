export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    try {
        const { type, index, password } = req.body || {};

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: "Falsches Passwort" });
        }

        const fileMap = {
            trikots: "trikots.json",
            spiele: "spiele.json",
            garageAktuell: "garageAktuell.json",
            garageAlt: "garageAlt.json",
            blog: "blog.json"
        };

        const fileName = fileMap[type];
        if (!fileName) {
            return res.status(400).json({ message: "Ungültige Kategorie" });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO = "BelliTim/Public";
        const jsonPath = `content/${fileName}`;

        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github+json"
            }
        });

        if (!getRes.ok) {
            const err = await getRes.text();
            console.error("Datei nicht gefunden:", err);
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await getRes.json();

        let data = JSON.parse(
            Buffer.from(String(fileData.content || "").replace(/\n/g, ""), "base64").toString("utf8")
        );

        const i = Number(index);
        if (!Array.isArray(data) || isNaN(i) || i < 0 || i >= data.length) {
            return res.status(400).json({ message: "Ungültiger Index" });
        }

        data.splice(i, 1);

        const updated = Buffer.from(
            JSON.stringify(data, null, 2),
            "utf8"
        ).toString("base64");

        const saveRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: "Eintrag gelöscht",
                content: updated,
                sha: fileData.sha
            })
        });

        if (!saveRes.ok) {
            const err = await saveRes.text();
            console.error("Speichern fehlgeschlagen:", err);
            return res.status(500).json({ message: "Speichern fehlgeschlagen" });
        }

        return res.status(200).json({ message: "Gelöscht ✅" });
    } catch (err) {
        console.error("Serverfehler in delete.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
