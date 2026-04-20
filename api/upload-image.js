export const config = {
    runtime: "edge"
};

export default async function handler(req) {

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Nur POST erlaubt" }), { status: 405 });
    }

    try {
        const formData = await req.formData();

        const file = formData.get("file");
        const password = formData.get("password");

        // 🔐 Passwort prüfen
        if (password !== process.env.ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401 });
        }

        if (!file) {
            return new Response(JSON.stringify({ error: "Keine Datei" }), { status: 400 });
        }

        // 📦 Datei lesen
        const bytes = await file.arrayBuffer();

        // 🔥 EDGE FIX (kein Buffer!)
        const base64 = btoa(
            new Uint8Array(bytes)
                .reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        // 🧠 EINZIGARTIGER DATEINAME
        const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2,8)}.jpg`;
        const path = `content/images/${fileName}`;

        // 🚀 Upload zu GitHub
        const uploadRes = await fetch(`https://api.github.com/repos/BelliTim/Public/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Bild hochgeladen",
                content: base64
            })
        });

        const data = await uploadRes.json();
        console.log("GITHUB RESPONSE:", data);

        // ❌ Fehler anzeigen
        if (!uploadRes.ok) {
            console.log("GITHUB ERROR:", data);
            return new Response(JSON.stringify({
                error: data.message,
                full: data
            }), { status: 500 });
        }

        // ✅ Erfolg
        return new Response(JSON.stringify({
            url: `/content/images/${fileName}`
        }), { status: 200 });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return new Response(JSON.stringify({
            error: err.message
        }), { status: 500 });
    }
}
