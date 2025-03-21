export default function handler(req, res) {
    const { username } = req.query;
    const profileName = username ? decodeURIComponent(username) : "Profile";

    res.setHeader("Content-Type", "text/html");
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${profileName}'s Profile</title>
            <meta property="og:title" content="${profileName}'s Profile" />
            <meta property="og:description" content="Check out ${profileName}'s profile!" />
            <meta property="og:image" content="https://your-site.vercel.app/${username}.jpg" />
            <meta property="og:url" content="https://your-site.vercel.app/${username}" />
        </head>
        <body>
            <h1>Welcome to ${profileName}'s Profile</h1>
        </body>
        </html>
    `);
}