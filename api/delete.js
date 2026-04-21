export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    try {
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

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO = "BelliTim/Public";
        const path = `content/${fileName}`;

        // Datei laden
        const getRes = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`
                }
            }
        );

        if (getRes.status !== 200) {
            const err = await getRes.text();
            console.log(err);
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await getRes.json();

        let data = JSON.parse(
            Buffer.from(fileData.content, "base64").toString("utf8")
        );

        const i = Number(index);

        if (isNaN(i) || i < 0 || i >= data.length) {
            return res.status(400).json({ message: "Ungültiger Index" });
        }

        // Nur Datensatz löschen
        data.splice(i, 1);

        const updated = Buffer.from(
            JSON.stringify(data, null, 2),
            "utf8"
        ).toString("base64");

        const saveRes = await fetch(
            `https://api.github.com/repos/${REPO}/contents/${path}`,
            {
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
            }
        );

        if (saveRes.status !== 200 && saveRes.status !== 201) {
            const err = await saveRes.text();
            console.log(err);
            return res.status(500).json({ message: "Speichern fehlgeschlagen" });
        }

        return res.status(200).json({ message: "Gelöscht ✅" });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
