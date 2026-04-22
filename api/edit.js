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

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`JSON laden fehlgeschlagen: ${err}`);
    }

    const fileData = await res.json();
    const decoded = Buffer.from(
        String(fileData.content || "").replace(/\n/g, ""),
        "base64"
    ).toString("utf8");

    const parsed = ensureIds(JSON.parse(decoded));

    return {
        data: Array.isArray(parsed) ? parsed : [],
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

function findEntryIndex(data, id, index) {
    if (id) {
        const found = data.findIndex(item => item && item.id === id);
        if (found !== -1) return found;
    }

    const numericIndex = Number(index);
    if (!Number.isNaN(numericIndex) && data[numericIndex]) {
        return numericIndex;
    }

    return -1;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const {
        type,
        id,
        index,
        title,
        comment,
        dateRange,
        images,
        existingImages,
        password
    } = req.body || {};

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Kein Zugriff" });
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

    try {
        const { data, sha } = await githubGetJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN
        });

        const entryIndex = findEntryIndex(data, id, index);
        if (entryIndex === -1) {
            return res.status(400).json({ message: "Eintrag nicht gefunden" });
        }

        const entry = data[entryIndex];
        if (!entry.id) {
            entry.id = createEntryId();
        }

        entry.title = String(title ?? "").trim();
        entry.comment = String(comment ?? "").trim();

        if (type === "blog") {
            entry.dateRange = String(dateRange ?? "").trim();
        }

        if (type !== "blog") {
            if (Array.isArray(images) && images.length > 0) {
                const imagePaths = [];

                for (let x = 0; x < images.length && x < 10; x++) {
                    const image = images[x];
                    if (typeof image !== "string" || !image.includes(",")) continue;

                    const base64 = image.split(",")[1];
                    const uploadedPath = await githubUploadBase64Image({
                        repo: REPO,
                        token: GITHUB_TOKEN,
                        base64,
                        prefix: "img"
                    });
                    imagePaths.push(uploadedPath);
                }

                if (imagePaths.length > 0) {
                    entry.images = imagePaths;
                }
            }
        }

        if (type === "blog") {
            const keptImages = Array.isArray(existingImages)
                ? existingImages.filter(img => typeof img === "string" && img.trim() !== "")
                : (Array.isArray(entry.images) ? entry.images : []);

            const newImagePaths = [];

            if (Array.isArray(images) && images.length > 0) {
                for (let x = 0; x < images.length; x++) {
                    if (keptImages.length + newImagePaths.length >= 10) break;

                    const image = images[x];
                    if (typeof image !== "string" || !image.includes(",")) continue;

                    const base64 = image.split(",")[1];
                    const uploadedPath = await githubUploadBase64Image({
                        repo: REPO,
                        token: GITHUB_TOKEN,
                        base64,
                        prefix: "img"
                    });
                    newImagePaths.push(uploadedPath);
                }
            }

            entry.images = [...keptImages, ...newImagePaths].slice(0, 10);
        }

        await githubSaveJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN,
            data,
            sha,
            message: "Eintrag bearbeitet"
        });

        return res.status(200).json({
            message: "Bearbeitet ✅",
            id: entry.id
        });
    } catch (err) {
        console.error("Serverfehler in edit.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
