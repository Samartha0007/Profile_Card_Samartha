// api/sitemap.js
import admin from "firebase-admin";

function initFirebase() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function absoluteBase(req) {
  return (
    process.env.SITE_BASE_URL ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`
  );
}

export default async function handler(req, res) {
  try {
    initFirebase();
    const db = admin.firestore();

    const profilesSnap = await db.collection("profiles").select("username").get();

    const base = absoluteBase(req).replace(/\/+$/, "");
    const urls = [];

    profilesSnap.forEach((doc) => {
      const data = doc.data();
      if (!data?.username) return;
      const loc = `${base}/${encodeURIComponent(
        String(data.username).toLowerCase()
      )}`;
      urls.push(`<url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(200).send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send("Sitemap error");
  }
}