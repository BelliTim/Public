export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Nur POST erlaubt");
  }

  const { password, content, filename } = req.body;

  if (password !== process.env.UPLOAD_PASSWORD) {
    return res.status(401).send("Falsches Passwort");
  }

  const response = await fetch(
    `https://api.github.com/repos/BelliTim/BelliTim_REPO/images/uploads/${filename}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Upload via Website",
        content: content,
      }),
    }
  );

  res.status(200).send("Upload erfolgreich");
}
