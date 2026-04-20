export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    try {

        const formData = await req.formData();
        const file = formData.get("file");
        const password = formData.get("password");

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: "Falsches Passwort" });
        }

        if (!file) {
            return res.status(400).json({ message: "Keine Datei" });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 🔥 FIX: eindeutiger Dateiname
        const fileName = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
        const path = `content/images/${fileName}`;

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO = "BelliTim/Public";

        const uploadRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Bild Upload",
                content: buffer.toString("base64")
            })
        });

        if (uploadRes.status !== 201) {
            const err = await uploadRes.text();
            return res.status(500).json({ message: "GitHub Fehler", error: err });
        }

        return res.status(200).json({
            url: `https://cdn.jsdelivr.net/gh/${REPO}@main/${path}`
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Serverfehler" });
    }
}
