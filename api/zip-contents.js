import AdmZip from "adm-zip";

export default async function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    const user = "Wycliffe147";
    const repo = "e-library";

    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    // Use GitHub API to get the download URL (works for private repos and LFS)
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/public/Media/${cleanPath}`;
    
    const fetchOptions = {
        headers: {
            "Accept": "application/vnd.github.v3+json"
        }
    };

    if (process.env.GITHUB_TOKEN) {
        fetchOptions.headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const apiResponse = await fetch(apiUrl, fetchOptions);
        if (!apiResponse.ok) {
            return res.status(apiResponse.status).send(`Failed to fetch ZIP metadata from GitHub: ${apiResponse.statusText}`);
        }

        const metadata = await apiResponse.json();
        const downloadUrl = metadata.download_url;

        if (!downloadUrl) {
            return res.status(404).send("Download URL not found for this ZIP.");
        }

        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch ZIP from GitHub: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const zip = new AdmZip(Buffer.from(buffer));
        const entries = zip.getEntries().map(entry => ({
            name: entry.entryName,
            isDirectory: entry.isDirectory,
            size: entry.header.size
        }));

        res.status(200).json(entries);
    } catch (error) {
        console.error("ZIP processing error:", error);
        res.status(500).send("Error reading ZIP contents. It might be too large or corrupted.");
    }
}
