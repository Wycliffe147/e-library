export default async function handler(req, res) {
    const user = "Wycliffe147";
    const repo = "e-library";
    const branch = "main";

    const url = `https://api.github.com/repos/${user}/${repo}/commits/${branch}`;

    const fetchOptions = {
        headers: {
            "Accept": "application/vnd.github.v3+json"
        }
    };

    if (process.env.GITHUB_TOKEN) {
        fetchOptions.headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            return res.status(response.status).json({ error: "Failed to fetch commit info" });
        }

        const data = await response.json();
        const date = data.commit.committer.date;

        res.status(200).json({ date });
    } catch (error) {
        console.error("Error fetching last updated:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
