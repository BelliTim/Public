export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Only POST allowed" });
    }

    const { file, fileName, category, title, comment } = req.body;

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    const path = `content/${category}.json`;

    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${token}` }
    });

    const fileData = await fileRes.json();
    const content = JSON.parse(Buffer.from(fileData.content, "base64").toString());

    const newEntry = {
        title,
        comment,
        description: comment,
        image: file,
        images: [file]
    };

    content.push(newEntry);

    const updated = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Neuer Eintrag",
            content: updated,
            sha: fileData.sha
        })
    });

    res.status(200).json({ message: "Upload erfolgreich 🚀" });
}
