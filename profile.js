// profile.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with YOUR exact configuration
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "newai-52371",
    clientEmail: "firebase-adminsdk@newai-52371.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: "https://newai-52371.firebaseio.com",
  storageBucket: "newai-52371.appspot.com"
});

const db = admin.firestore();

module.exports = async (req, res) => {
  // Extract username from query parameter (from your vercel.json rewrite rule)
  const { username } = req.query;

  if (!username) {
    return res.status(400).send('Username is required in the URL (e.g., /username)');
  }

  try {
    // Fetch profile from Firestore
    const profilesRef = db.collection('profiles');
    const snapshot = await profilesRef.where('username', '==', username).get();

    if (snapshot.empty) {
      return res.status(404).send(`Profile "${username}" not found`);
    }

    const profile = snapshot.docs[0].data();
    const currentUrl = `https://${req.headers.host}/${username}`;

    // Set defaults if fields are missing
    const profileData = {
      name: profile.name || username,
      image: profile.imageUrl || 'https://i.ibb.co/sKbrkyn/default-profile.png',
      bio: profile.bio || 'Check out my profile!',
      url: currentUrl
    };

    // Generate the HTML with dynamic meta tags
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${profileData.name}'s Profile</title>
      <meta property="og:title" content="${profileData.name}'s Profile">
      <meta property="og:description" content="${profileData.bio}">
      <meta property="og:image" content="${profileData.image}">
      <meta property="og:url" content="${profileData.url}">
      <meta property="og:type" content="website">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${profileData.name}'s Profile">
      <meta name="twitter:description" content="${profileData.bio}">
      <meta name="twitter:image" content="${profileData.image}">
      <link rel="icon" href="${profileData.image}">
    </head>
    <body>
      <!-- Fallback content for social scrapers -->
      <div style="text-align: center; padding: 20px;">
        <h1>${profileData.name}'s Profile</h1>
        <img src="${profileData.image}" alt="${profileData.name}" style="width: 200px; border-radius: 50%;">
        <p>${profileData.bio}</p>
        <p><a href="${profileData.url}">View full profile</a></p>
      </div>
      
      <!-- Redirect to actual profile page -->
      <script>
        window.location.href = "/${username}?from_share=true";
      </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.send(html);

  } catch (error) {
    console.error('Firebase Error:', error);
    res.status(500).send(`
      <h1>Server Error</h1>
      <p>We're having trouble loading this profile. Please try again later.</p>
      <p><a href="/">Return home</a></p>
    `);
  }
};