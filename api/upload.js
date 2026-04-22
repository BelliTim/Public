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

async function githubGetJson({ repo, path, token }) {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
        }
    });

    if (res.status === 404) {
        return { data: [], sha: null };
    }

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`JSON laden fehlgeschlagen: ${err}`);
    }

    const fileData = await res.json();
    const decoded = Buffer.from(
        String(fileData.content || "").replace(/\n/g, ""),
        "base64"
    ).toString("utf8");

    let parsed = JSON.parse(decoded);
    parsed = ensureIds(Array.isArray(parsed) ? parsed : []);

    return {
        data: parsed,
        sha: fileData.sha || null
    };
}

async function githubSaveJson({ repo, path, token, data, sha, message }) {
    const contentBase64 = Buffer.from(
        JSON.stringify(data, null, 2),
        "utf8"
    ).toString("base64");

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
            message,
            content: contentBase64,
            sha
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`JSON speichern fehlgeschlagen: ${err}`);
    }

    return await res.json();
}

async function githubUploadBase64Image({ repo, token, base64, prefix = "img" }) {
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const imagePath = `content/images/${fileName}`;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${imagePath}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
            message: `Bild Upload ${fileName}`,
            content: base64
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Bild Upload fehlgeschlagen: ${err}`);
    }

    return `/content/images/${fileName}`;
}

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

        for (let i = 0; i < images.length && i < 10; i++) {
            const image = images[i];
            if (typeof image !== "string" || !image.includes(",")) continue;

            const base64 = image.split(",")[1];
            const path = await githubUploadBase64Image({
                repo: REPO,
                token: GITHUB_TOKEN,
                base64,
                prefix: "img"
            });
            imagePaths.push(path);
        }

        if (imagePaths.length === 0) {
            return res.status(400).json({ message: "Keine gültigen Bilder" });
        }

        const { data, sha } = await githubGetJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN
        });

        const newEntry = {
            id: createEntryId(),
            title: safeTitle,
            comment: safeComment,
            images: imagePaths
        };

        if (category === "blog") {
            newEntry.dateRange = safeDateRange;
        }

        data.unshift(newEntry);

        await githubSaveJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN,
            data,
            sha,
            message: "Neuer Eintrag"
        });

        return res.status(200).json({
            message: "Upload erfolgreich 🚀",
            id: newEntry.id
        });
    } catch (err) {
        console.error("Serverfehler in upload.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
