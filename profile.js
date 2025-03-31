// profile.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with YOUR EXACT CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBb3x_zD9JaFwL9PhmngCNZlS2fOh6MBa4",
  authDomain: "newai-52371.firebaseapp.com",
  projectId: "newai-52371",
  storageBucket: "newai-52371.appspot.com",
  messagingSenderId: "480586908639",
  appId: "1:480586908639:web:f4645a852c4df724c6fa6a"
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: firebaseConfig.projectId,
    clientEmail: `firebase-adminsdk-${firebaseConfig.projectId.substring(0, 8)}@${firebaseConfig.projectId}.iam.gserviceaccount.com`,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
  storageBucket: firebaseConfig.storageBucket
});

const db = admin.firestore();

module.exports = async (req, res) => {
  const username = req.url.split('/')[1]; // Extract username from URL

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Query Firestore for the profile
    const q = db.collection('profiles').where('username', '==', username);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = snapshot.docs[0].data();
    const currentUrl = `https://${req.headers.host}/${username}`;

    // Generate dynamic meta tags
    const metaTags = {
      title: `${profile.name || username}'s Profile`,
      image: profile.imageUrl || 'https://i.ibb.co/sKbrkyn/default-profile.png',
      description: profile.bio || 'Check out my profile!',
      url: currentUrl
    };

    // HTML response with dynamic meta tags
    const html = `<!DOCTYPE html>
    <html>
      <head>
        <title>${metaTags.title}</title>
        <meta property="og:title" content="${metaTags.title}">
        <meta property="og:image" content="${metaTags.image}">
        <meta property="og:description" content="${metaTags.description}">
        <meta property="og:url" content="${metaTags.url}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${metaTags.title}">
        <meta name="twitter:image" content="${metaTags.image}">
        <meta name="twitter:description" content="${metaTags.description}">
      </head>
      <body>
        <script>
          window.location.href = "/${username}?from_share=true";
        </script>
      </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Firebase Error:', error);
    res.status(500).json({ error: "Server error" });
  }
};