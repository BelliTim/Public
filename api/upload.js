export default async function handler(req, res) {

    if(req.method !== "POST"){
        return res.status(405).json({ message: "Nur POST erlaubt" });
    }

    const { images, category, title, comment, password } = req.body;

    if(password !== process.env.ADMIN_PASSWORD){
        return res.status(401).json({ message: "Falsches Passwort" });
    }

    if(!images || images.length === 0 || !title){
        return res.status(400).json({ message: "Fehlende Daten" });
    }

    const fileMap = {
        trikots: "trikots.json",
        spiele: "spiele.json",
        garageAktuell: "garageAktuell.json",
        garageAlt: "garageAlt.json"
    };

    const fileName = fileMap[category];

    if(!fileName){
        return res.status(400).json({ message: "Ungültige Kategorie" });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = "DEIN_USERNAME/DEIN_REPO"; // ❗ ANPASSEN

    const path = `content/${fileName}`;

    // Datei laden
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`
        }
    });

    let data = [];
    let sha = null;

    if(getRes.status === 200){
        const fileData = await getRes.json();
        sha = fileData.sha;

        const content = JSON.parse(Buffer.from(fileData.content, "base64").toString());
        data = content;
    }

    // neuen Eintrag hinzufügen
    data.push({
        title,
        comment,
        images
    });

    const updated = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

    // Datei speichern
    await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
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

    res.status(200).json({ message: "Upload erfolgreich" });
}
