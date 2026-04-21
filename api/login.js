import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const form = formidable();

  form.parse(req, (err, fields) => {

    if (err) {
      return res.status(500).json({ message: "Fehler beim Parsen" });
    }

    const password = Array.isArray(fields.password)
  ? fields.password[0]
  : fields.password;

    if (!password) {
      return res.status(400).json({ message: "Kein Passwort" });
    }

    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(200).json({ message: "OK" });
    } else {
      return res.status(401).json({ message: "Falsches Passwort" });
    }
  });
}
