export default async function handler(req, res) {

    const { type, index, password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Kein Zugriff" });
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    const path = `content/${type}.json`;

    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${token}` }
    });

    const fileData = await fileRes.json();
    const content = JSON.parse(Buffer.from(fileData.content, "base64").toString());

    content.splice(index, 1);

    const updated = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Delete",
            content: updated,
            sha: fileData.sha
        })
    });

    res.status(200).json({ message: "Gelöscht" });
}
