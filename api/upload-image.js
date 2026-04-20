export const config = {
  api: {
    bodyParser: false,
  },
};

export const config = {
    api: {
        bodyParser: false
    }
};

import formidable from "formidable";
import fs from "fs";

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Nur POST erlaubt" });
    }

    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {

        try {
            if (err) {
                return res.status(500).json({ error: "Upload Fehler" });
            }

            const password = fields.password;
            if (password !== process.env.ADMIN_PASSWORD) {
                return res.status(401).json({ error: "Falsches Passwort" });
            }

            const file = files.file;

            if (!file) {
                return res.status(400).json({ error: "Keine Datei" });
            }

            const buffer = fs.readFileSync(file.filepath);

            const fileName = `img_${Date.now()}.jpg`;
            const path = `content/images/${fileName}`;

            const uploadRes = await fetch(`https://api.github.com/repos/BelliTim/Public/contents/${path}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "Bild hochgeladen",
                    content: buffer.toString("base64")
                })
            });

            const data = await uploadRes.json();

            if (!uploadRes.ok) {
                return res.status(500).json({ error: data.message });
            }

            return res.status(200).json({
                url: `/content/images/${fileName}`
            });

        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Serverfehler" });
        }
    });
}
