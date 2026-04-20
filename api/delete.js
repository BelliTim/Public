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
    const path = `content/${fileName}`;

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "BelliTim/Public";

    try {

        // 📥 JSON laden
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`
            }
        });

        const fileData = await getRes.json();
        const sha = fileData.sha;

        let data = JSON.parse(
            Buffer.from(fileData.content, "base64").toString()
        );

        const entry = data[index];

        // 🔥 BILDER LÖSCHEN
        for (let img of entry.images) {

            // 👉 URL in GitHub Pfad umwandeln
            const imagePath = img.replace(
                "https://cdn.jsdelivr.net/gh/BelliTim/Public@main/",
                ""
            );

            // 📥 SHA holen
            const imgRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${imagePath}`, {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`
                }
            });

            if (imgRes.status !== 200) continue;

            const imgData = await imgRes.json();

            // ❌ löschen
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

        // 🗑️ Eintrag entfernen
        data.splice(index, 1);

        const updated = Buffer.from(
            JSON.stringify(data, null, 2)
        ).toString("base64");

        await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
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

        return res.status(200).json({ message: "Gelöscht ✅" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
