import { useRouter } from "next/router";
import Head from "next/head";

export default function ProfilePage() {
    const router = useRouter();
    const { username } = router.query;

    return (
        <>
            <Head>
                <title>{username}'s Profile</title>
                <meta property="og:title" content={`${username}'s Profile`} />
                <meta property="og:description" content={`Check out ${username}'s profile on MyWebSam`} />
                <meta property="og:image" content={`https://mywebsam.site/profile-pics/${username}.jpg`} />
                <meta property="og:url" content={`https://mywebsam.site/${username}`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${username}'s Profile`} />
                <meta name="twitter:description" content={`Check out ${username}'s profile on MyWebSam`} />
                <meta name="twitter:image" content={`https://mywebsam.site/profile-pics/${username}.jpg`} />
            </Head>
            <h1>Welcome to {username}'s Profile</h1>
        </>
    );
}