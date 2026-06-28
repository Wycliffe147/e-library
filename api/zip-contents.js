import AdmZip from "adm-zip";

export default async function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    // Public repo now, so we can hit GitHub's LFS media CDN directly —
    // no GitHub API lookup, no token needed.
    const sourceUrl = `https://media.githubusercontent.com/media/Wycliffe147/e-library-media/main/${cleanPath}`;

    try {
        const response = await fetch(sourceUrl);
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

        // Cache the listing at Vercel's edge so repeat "View Contents" clicks
        // on the same zip don't re-pull and re-extract the whole archive.
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
        res.status(200).json(entries);
    } catch (error) {
        console.error("ZIP processing error:", error);
        res.status(500).send("Error reading ZIP contents. It might be too large or corrupted.");
    }
}
