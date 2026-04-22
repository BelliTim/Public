export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { images, category, title, dateRange, comment, password } = req.body || {};

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Falsches Passwort" });
    }

    if (!Array.isArray(images) || images.length === 0 || !title) {
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
    const jsonPath = `content/${fileName}`;

    const safeTitle = String(title ?? "").trim();
    const safeDateRange = String(dateRange ?? "").trim();
    const safeComment = String(comment ?? "").trim();

    try {
        const imagePaths = [];

        // 1) Bilder hochladen
        for (let i = 0; i < images.length && i < 10; i++) {
            const image = images[i];

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
                    "Content-Type": "application/json",
                    "Accept": "application/vnd.github+json"
                },
                body: JSON.stringify({
                    message: "Bild Upload",
                    content: base64
                })
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                console.error("Bild Upload fehlgeschlagen:", err);
                return res.status(500).json({ message: "Bild Upload fehlgeschlagen" });
            }

            imagePaths.push(`/content/images/${fileNameImg}`);
        }

        if (imagePaths.length === 0) {
            return res.status(400).json({ message: "Keine gültigen Bilder" });
        }

        // 2) JSON laden
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github+json"
            }
        });

        let data = [];
        let sha = null;

        if (getRes.status === 200) {
            const fileData = await getRes.json();
            sha = fileData.sha || null;

            const decoded = Buffer.from(
                String(fileData.content || "").replace(/\n/g, ""),
                "base64"
            ).toString("utf8");

            const parsed = JSON.parse(decoded);
            data = Array.isArray(parsed) ? parsed : [];
        } else if (getRes.status !== 404) {
            const err = await getRes.text();
            console.error("JSON laden fehlgeschlagen:", err);
            return res.status(500).json({ message: "JSON laden fehlgeschlagen" });
        }

        // 3) Eintrag hinzufügen
        data.unshift({
            title: safeTitle,
            dateRange: safeDateRange,
            comment: safeComment,
            images: imagePaths
        });

        const updated = Buffer.from(
            JSON.stringify(data, null, 2),
            "utf8"
        ).toString("base64");

        // 4) JSON speichern
        const saveRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify({
                message: "Neuer Eintrag",
                content: updated,
                sha
            })
        });

        if (!saveRes.ok) {
            const err = await saveRes.text();
            console.error("JSON speichern fehlgeschlagen:", err);
            return res.status(500).json({ message: "JSON speichern fehlgeschlagen" });
        }

        return res.status(200).json({ message: "Upload erfolgreich 🚀" });
    } catch (err) {
        console.error("Serverfehler in upload.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}