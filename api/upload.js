export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { images, category, title, dateRange, comment, password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Falsches Passwort" });
    }

    if (!images || images.length === 0 || !title) {
        return res.status(400).json({ message: "Fehlende Daten" });
    }

    const fileMap = {
        trikots: "trikots.json",
        spiele: "spiele.json",
        garageAktuell: "garageAktuell.json",
        garageAlt: "garageAlt.json",
        blog: "blog.json"
    };

    const fileName = fileMap[category];
    if (!fileName) {
        return res.status(400).json({ message: "Ungültige Kategorie" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "BelliTim/Public";

    const imagePaths = [];

    try {

        // 🔥 1. Bilder einzeln hochladen
        for (let i = 0; i < images.length; i++) {

            const base64 = images[i].split(",")[1];

            const fileNameImg = `img_${Date.now()}_${i}.jpg`;
            const path = `content/images/${fileNameImg}`;

            const uploadRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "Bild Upload",
                    content: base64
                })
            });

            if (uploadRes.status !== 201) {
                const err = await uploadRes.text();
                console.error(err);
                return res.status(500).json({ message: "Bild Upload fehlgeschlagen" });
            }

            imagePaths.push(`/content/images/${fileNameImg}`);
        }

        // 🔥 2. JSON laden
        const jsonPath = `content/${fileName}`;

        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        let data = [];
        let sha = null;

        if (getRes.status === 200) {
            const fileData = await getRes.json();
            sha = fileData.sha;

            const decoded = atob(fileData.content.replace(/\n/g, ""));
            data = JSON.parse(decoded);
        }

        // 🔥 3. Eintrag hinzufügen
        data.unshift({
            title,
            comment,
            images: imagePaths
        });

        const updated = Buffer.from(
            JSON.stringify(data, null, 2)
        ).toString("base64");

        // 🔥 4. JSON speichern
        const saveRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
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

        if (saveRes.status !== 200 && saveRes.status !== 201) {
            const err = await saveRes.text();
            console.error(err);
            return res.status(500).json({ message: "JSON speichern fehlgeschlagen" });
        }

        return res.status(200).json({ message: "Upload erfolgreich 🚀" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
}
