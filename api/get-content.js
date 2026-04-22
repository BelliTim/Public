function createEntryId() {
    return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureIds(data) {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
        if (item && typeof item === "object" && !item.id) {
            return { ...item, id: createEntryId() };
        }
        return item;
    });
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Nur GET erlaubt" });
    }

    try {
        const { type } = req.query || {};

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

        const fileRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${jsonPath}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json"
            }
        });

        if (!fileRes.ok) {
            const err = await fileRes.text();
            console.error("JSON laden fehlgeschlagen:", err);
            return res.status(500).json({ message: "Datei nicht gefunden" });
        }

        const fileData = await fileRes.json();
        const decoded = Buffer.from(
            String(fileData.content || "").replace(/\n/g, ""),
            "base64"
        ).toString("utf8");

        const parsed = ensureIds(JSON.parse(decoded));

        return res.status(200).json(parsed);
    } catch (err) {
        console.error("Serverfehler in get-content.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}