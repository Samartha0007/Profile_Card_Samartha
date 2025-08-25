// api/profile.js
import admin from "firebase-admin";

function initFirebase() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

  // Support keys with literal "\n"
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

    const usernameRaw =
      (req.query.username || "").toString().trim().toLowerCase();

    if (!usernameRaw) {
      res.status(400).send("Missing username");
      return;
    }

    // Query Firestore: collection "profiles" with field "username"
    const snap = await db
      .collection("profiles")
      .where("username", "==", usernameRaw)
      .limit(1)
      .get();

    if (snap.empty) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(404).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Profile Not Found | MyPortfolio</title>
  <meta name="robots" content="noindex">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:680px;margin:6rem auto;padding:0 1rem;line-height:1.5}</style>
</head>
<body>
  <h1>Profile Not Found</h1>
  <p>The profile <code>${escapeHtml(usernameRaw)}</code> does not exist.</p>
  <p><a href="/">Go to Home</a></p>
</body>
</html>`);
      return;
    }

    const profile = snap.docs[0].data();

    const name = profile.name || usernameRaw;
    const bio = textSummary(profile.bio || "Profile on MyPortfolio");
    const image =
      profile.imageUrl ||
      "https://via.placeholder.com/1200x630.png?text=MyPortfolio";
    const loc = profile.location || "";
    const birthday = profile.birthday || "";
    const pageUrl = absoluteUrl(req, `/${usernameRaw}`);

    const sameAs = [];
    const add = (cond, url) => cond && sameAs.push(url);

    add(profile.instagram, `https://www.instagram.com/${profile.instagram}`);
    add(profile.snapchat, `https://www.snapchat.com/add/${profile.snapchat}`);
    add(profile.youtubeChannel, `https://www.youtube.com/${profile.youtubeChannel}`);
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
      ...(loc ? { address: { "@type": "PostalAddress", addressLocality: loc } } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(birthday ? { birthDate: new Date(birthday).toISOString().slice(0, 10) } : {}),
    };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");

    // You can link your style.css to make it look like your SPA if you want
    res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(name)} | MyPortfolio</title>
  <meta name="description" content="${escapeHtml(bio)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">

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

  <script type="application/ld+json">
${JSON.stringify(jsonLd)}
  </script>

  <link rel="stylesheet" href="/style.css">
  <style>
    /* Minimal safety styling if style.css fails to load */
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;line-height:1.5;margin:0}
    .wrap{max-width:960px;margin:2rem auto;padding:0 1rem}
    .card{display:grid;grid-template-columns:140px 1fr;gap:1rem;align-items:center}
    .avatar{width:140px;height:140px;object-fit:cover;border-radius:16px}
    .meta{color:#555}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <img class="avatar" src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
      <div>
        <h1>${escapeHtml(name)}</h1>
        <p>${escapeHtml(bio)}</p>
        ${loc ? `<p class="meta"><strong>Location:</strong> ${escapeHtml(loc)}</p>` : ""}
        ${birthday ? `<p class="meta"><strong>Birthday:</strong> ${escapeHtml(new Date(birthday).toDateString())}</p>` : ""}
        <p><a href="/">⬅ Back to Home</a></p>
      </div>
    </div>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}