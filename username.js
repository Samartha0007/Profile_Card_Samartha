import { useRouter } from 'next/router';

export async function getServerSideProps(context) {
    const { username } = context.query;

    // Replace this with your actual database fetching logic
    const user = {
        name: username || "Unknown User",
        bio: "This is " + (username || "Unknown") + "'s profile.",
        image: "https://via.placeholder.com/150" // Replace with the actual profile picture URL
    };

    return {
        props: { user }
    };
}

export default function ProfilePage({ user }) {
    return (
        <>
            <head>
                <title>{user.name}'s Profile</title>
                <meta property="og:title" content={user.name + "'s Profile"} />
                <meta property="og:description" content={user.bio} />
                <meta property="og:image" content={user.image} />
            </head>
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <img src={user.image} alt={user.name} width="150" />
                <h1>{user.name}</h1>
                <p>{user.bio}</p>
            </div>
        </>
    );
}