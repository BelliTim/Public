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

        if (password !== process.env.ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Falsches Passwort" }), { status: 401 });
        }

        if (!file) {
            return new Response(JSON.stringify({ error: "Keine Datei" }), { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileName = `img_${Date.now()}.jpg`;
        const path = `content/images/${fileName}`;

        const uploadRes = await fetch(`https://api.github.com/repos/BelliTim/Public/contents/${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Bild hochgeladen",
                content: buffer.toString("base64")
            })
        });

        const data = await uploadRes.json();

        if (!uploadRes.ok) {
            return new Response(JSON.stringify({ error: data.message }), { status: 500 });
        }

        return new Response(JSON.stringify({
            url: `/content/images/${fileName}`
        }), { status: 200 });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
