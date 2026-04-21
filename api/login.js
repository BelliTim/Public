export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  try {

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Kein Passwort" });
    }

    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(200).json({ message: "OK" });
    } else {
      return res.status(401).json({ message: "Falsches Passwort" });
    }

  } catch (err) {
    return res.status(500).json({ message: "Server Fehler" });
  }
}
