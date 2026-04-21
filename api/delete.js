export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { type, index, password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Falsches Passwort" });
    }

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

    const path = `content/${fileName}`;

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "BelliTim/Public";

    try {

        // JSON laden
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        if (getRes.status !== 200) {
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await getRes.json();
        const sha = fileData.sha;

        let data = JSON.parse(
            Buffer.from(fileData.content, "base64").toString("utf8")
        );

        const entry = data[index];

        if (!entry) {
            return res.status(400).json({ message: "Eintrag nicht gefunden" });
        }

        // 🔥 Bilder sicher sammeln
        let images = [];

        if (Array.isArray(entry.images)) {
            images = entry.images;
        } else if (entry.image) {
            images = [entry.image];
        }

        // Bilder löschen
        for (let img of images) {

            let imagePath = img
                .replace("https://cdn.jsdelivr.net/gh/BelliTim/Public@main/", "")
                .replace("/content/", "content/");

            const imgRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${imagePath}`, {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`
                }
            });

            if (imgRes.status !== 200) continue;

            const imgData = await imgRes.json();

            await fetch(`https://api.github.com/repos/${REPO}/contents/${imagePath}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "Bild gelöscht",
                    sha: imgData.sha
                })
            });
        }

        // Eintrag löschen
        data.splice(index, 1);

        const updated = Buffer.from(
            JSON.stringify(data, null, 2),
            "utf8"
        ).toString("base64");

        const saveRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Eintrag gelöscht",
                content: updated,
                sha
            })
        });

        if (saveRes.status !== 200 && saveRes.status !== 201) {
            return res.status(500).json({ message: "Speichern fehlgeschlagen" });
        }

        return res.status(200).json({ message: "Gelöscht ✅" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
