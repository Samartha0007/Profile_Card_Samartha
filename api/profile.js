// api/profile.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

function initFirebase() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textSummary(str = "", max = 160) {
  const clean = str.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function absoluteUrl(req, path = "") {
  const base =
    process.env.SITE_BASE_URL ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  if (!path) return base;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export default async function handler(req, res) {
  try {
    initFirebase();
    const db = admin.firestore();

    const usernameRaw = (req.query.username || "").toString().trim();
    const usernameLower = usernameRaw.toLowerCase();

    // Load SPA HTML
    const indexPath = path.resolve("./public/index.html");
    let html = "";
    try {
      html = fs.readFileSync(indexPath, "utf8");
    } catch (e) {
      console.error("❌ Could not load index.html:", e);
      res.status(500).send("index.html missing on server");
      return;
    }

    // No username → serve intro SPA
    if (!usernameRaw) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
      return;
    }

    // Query Firestore using case-insensitive field
    const snap = await db
      .collection("profiles")
      .where("usernameLower", "==", usernameLower)
      .limit(1)
      .get();

    if (snap.empty) {
      // Inject "Profile Not Found" meta tags
      const notFoundTitle = "Profile Not Found | MyPortfolio";
      const notFoundDesc = `The profile ${escapeHtml(
        usernameRaw
      )} does not exist on MyPortfolio`;

      html = html.replace(/<title[^>]*>.*<\/title>/i, `<title>${notFoundTitle}</title>`);
      html = html.replace(
        /<\/head>/i,
        `<meta name="description" content="${notFoundDesc}">\n</head>`
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(404).send(html);
      return;
    }

    // Profile exists
    const profile = snap.docs[0].data();
    const name = profile.name || usernameRaw;
    const bio = textSummary(profile.bio || "Profile on MyPortfolio");
    const image =
      profile.imageUrl ||
      "https://via.placeholder.com/1200x630.png?text=MyPortfolio";
    const pageUrl = absoluteUrl(req, `/${usernameRaw}`);
    const loc = profile.location || "";
    const birthday = profile.birthday || "";

    // sameAs for JSON-LD
    const sameAs = [];
    const add = (cond, url) => cond && sameAs.push(url);

    add(profile.instagram, `https://www.instagram.com/${profile.instagram}`);
    add(profile.snapchat, `https://www.snapchat.com/add/${profile.snapchat}`);
    add(
      profile.youtubeChannel,
      `https://www.youtube.com/${profile.youtubeChannel}`
    );
    add(profile.twitter, `https://twitter.com/${profile.twitter}`);
    add(profile.facebook, `https://facebook.com/${profile.facebook}`);
    add(profile.linkedin, `https://linkedin.com/in/${profile.linkedin}`);
    add(profile.github, `https://github.com/${profile.github}`);
    add(profile.telegram, `https://t.me/${profile.telegram}`);
    add(profile.whatsapp, `https://wa.me/${profile.whatsapp}`);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      description: bio,
      url: pageUrl,
      image,
      ...(loc
        ? { address: { "@type": "PostalAddress", addressLocality: loc } }
        : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(birthday
        ? { birthDate: new Date(birthday).toISOString().slice(0, 10) }
        : {}),
    };

    // Inject dynamic meta tags
    html = html.replace(
      /<title[^>]*>.*<\/title>/i,
      `<title>${escapeHtml(name)} | MyPortfolio</title>`
    );
    html = html.replace(
      /<\/head>/i,
      `
<meta name="description" content="${escapeHtml(bio)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeHtml(name)} | MyPortfolio">
<meta property="og:description" content="${escapeHtml(bio)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(name)} | MyPortfolio">
<meta name="twitter:description" content="${escapeHtml(bio)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>`
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(200).send(html);
  } catch (err) {
    console.error("❌ Profile handler error:", err);
    res.status(500).send(err.message || "Server error");
  }
}