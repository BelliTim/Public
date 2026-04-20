import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const { title, comment } = req.body;

    if (!title || !comment) {
      return res.status(400).json({ message: "Titel und Kommentar fehlen" });
    }

    const filePath = path.join(process.cwd(), "content", "posts.json");

    let posts = [];

    // Falls Datei existiert → laden
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      posts = JSON.parse(data);
    }

    // Neuer Eintrag
    const newPost = {
      id: Date.now(),
      title,
      comment,
      date: new Date().toISOString()
    };

    posts.unshift(newPost); // oben hinzufügen

    // Speichern
    fs.writeFileSync(filePath, JSON.stringify(posts, null, 2));

    return res.status(200).json({ message: "Gespeichert!", post: newPost });

  } catch (err) {
    return res.status(500).json({ message: "Fehler beim Speichern", error: err });
  }
}
