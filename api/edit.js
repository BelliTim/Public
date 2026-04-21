export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { type, index, title, comment, images, password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Kein Zugriff" });
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
    const jsonPath = `content/${fileName}`;

    try {
        // JSON-Datei laden
        const fileRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        if (fileRes.status !== 200) {
            const err = await fileRes.text();
            console.error("JSON laden fehlgeschlagen:", err);
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await fileRes.json();

        const content = JSON.parse(
            Buffer.from(fileData.content, "base64").toString("utf8")
        );

        if (!content[index]) {
            return res.status(400).json({ message: "Eintrag nicht gefunden" });
        }

        // Text aktualisieren
        content[index].title = title;
        content[index].comment = comment;

        // Falls neue Bilder mitgegeben wurden:
        // Base64-Bilder erst als echte Dateien zu GitHub hochladen
        if (Array.isArray(images) && images.length > 0) {
            const imagePaths = [];

            for (let i = 0; i < images.length && i < 10; i++) {
                const image = images[i];

                // Nur Base64 Data-URLs akzeptieren
                if (typeof image !== "string" || !image.includes(",")) {
                    continue;
                }

                const base64 = image.split(",")[1];
                const fileNameImg = `img_${Date.now()}_${i}.jpg`;
                const imagePath = `content/images/${fileNameImg}`;

                const uploadRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${imagePath}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: "Bild bei Bearbeitung ersetzt",
                        content: base64
                    })
                });

                if (uploadRes.status !== 201) {
                    const err = await uploadRes.text();
                    console.error("Bild-Upload fehlgeschlagen:", err);
                    return res.status(500).json({ message: "Bild-Upload fehlgeschlagen" });
                }

                imagePaths.push(`/content/images/${fileNameImg}`);
            }

            // Nur ersetzen, wenn wirklich neue Bilder erfolgreich hochgeladen wurden
            if (imagePaths.length > 0) {
                content[index].images = imagePaths;
            }
        }

        const updated = Buffer.from(
            JSON.stringify(content, null, 2),
            "utf8"
        ).toString("base64");

        const updateRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Eintrag bearbeitet",
                content: updated,
                sha: fileData.sha
            })
        });

        if (updateRes.status !== 200 && updateRes.status !== 201) {
            const err = await updateRes.text();
            console.error("JSON speichern fehlgeschlagen:", err);
            return res.status(500).json({ message: "Fehler beim Speichern" });
        }

        return res.status(200).json({ message: "Bearbeitet ✅" });

    } catch (err) {
        console.error("Serverfehler in edit.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
