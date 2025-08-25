import admin from "firebase-admin";
import fs from "fs";
import path from "path";

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
  return path ? `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}` : base;
}

export default async function handler(req, res) {
  try {
    initFirebase();
    const db = admin.firestore();

    const usernameRaw = (req.query.username || "").toString().trim().toLowerCase();
    if (!usernameRaw) return res.status(400).send("Missing username");

    const snap = await db
      .collection("profiles")
      .where("username", "==", usernameRaw)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).send("Profile not found");

    const profile = snap.docs[0].data();

    const name = profile.name || usernameRaw;
    const bio = textSummary(profile.bio || "Profile on MyPortfolio");
    const image = profile.imageUrl || "https://via.placeholder.com/1200x630.png?text=MyPortfolio";
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

    // Read the HTML template
    const templatePath = path.join(process.cwd(), "public", "profile.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    html = html
      .replace(/{{NAME}}/g, escapeHtml(name))
      .replace(/{{BIO}}/g, escapeHtml(bio))
      .replace(/{{IMAGE}}/g, escapeHtml(image))
      .replace(/{{PAGE_URL}}/g, pageUrl)
      .replace(
        /{{LOCATION_HTML}}/g,
        loc ? `<p class="meta"><strong>Location:</strong> ${escapeHtml(loc)}</p>` : ""
      )
      .replace(
        /{{BIRTHDAY_HTML}}/g,
        birthday ? `<p class="meta"><strong>Birthday:</strong> ${escapeHtml(new Date(birthday).toDateString())}</p>` : ""
      )
      .replace(/{{JSON_LD}}/g, JSON.stringify(jsonLd));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}