export default async function handler(req, res) {

    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        return res.status(200).json({ success: true });
    }

    return res.status(401).json({ success: false });
}
