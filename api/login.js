export default function handler(req, res) {
    return res.status(200).json({
        env: process.env.ADMIN_PASSWORD || "NICHT GESETZT"
    });
}
