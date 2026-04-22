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

    try {
        const { type, id, index, password } = req.body || {};

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

        const { data, sha } = await githubGetJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN
        });

        const entryIndex = findEntryIndex(data, id, index);
        if (entryIndex === -1) {
            return res.status(400).json({ message: "Eintrag nicht gefunden" });
        }

        data.splice(entryIndex, 1);

        await githubSaveJson({
            repo: REPO,
            path: jsonPath,
            token: GITHUB_TOKEN,
            data,
            sha,
            message: "Eintrag gelöscht"
        });

        return res.status(200).json({ message: "Gelöscht ✅" });
    } catch (err) {
        console.error("Serverfehler in delete.js:", err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
