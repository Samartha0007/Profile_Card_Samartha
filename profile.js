// profile.js
const admin = require('firebase-admin');

// Initialize Firebase (using your config from index.html)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "newai-52371",
    clientEmail: "firebase-adminsdk-xxxx@newai-52371.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: "https://newai-52371.firebaseio.com"
});

module.exports = async (req, res) => {
  const { username } = req.query; // Now getting username from query parameter
  
  if (!username) {
    return res.status(400).send("Username is required");
  }

  try {
    const snapshot = await admin.firestore()
      .collection('profiles')
      .where('username', '==', username)
      .get();

    if (snapshot.empty) {
      return res.status(404).send("Profile not found");
    }

    const profile = snapshot.docs[0].data();
    const currentUrl = `https://${req.headers.host}/${username}`;

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <title>${profile.name}'s Profile</title>
        <meta property="og:title" content="${profile.name}'s Profile">
        <meta property="og:image" content="${profile.imageUrl}">
        <meta property="og:url" content="${currentUrl}">
      </head>
      <body>
        <script>window.location.href = "/${username}?from_share=true";</script>
      </body>
    </html>`;

    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};