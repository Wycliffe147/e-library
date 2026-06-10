import AdmZip from "adm-zip";

export default async function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    // Git LFS logic (same as download.js)
    const host = "https://media.githubusercontent.com/media";
    const user = "Wycliffe147";
    const repo = "e-library";
    const branch = "main";

    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    const targetUrl = `${host}/${user}/${repo}/${branch}/Media/${cleanPath}`;

    try {
        const response = await fetch(targetUrl);
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
