export default async function handler(req, res) {
    const { file, mode } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    const lfsExtensions = ["pdf", "zip"];
    const ext = file.split(".").pop().toLowerCase();

    const host = lfsExtensions.includes(ext)
        ? "https://media.githubusercontent.com/media"
        : "https://raw.githubusercontent.com";

    const user = "Wycliffe147";
    const repo = "e-library";
    const branch = "main";

    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    const targetUrl = `${host}/${user}/${repo}/${branch}/Media/${cleanPath}`;

    // If the user explicitly wants to download, we can still redirect.
    // However, to force "Open" to work "normally" (inline), we must proxy the request
    // to override GitHub's default 'Content-Disposition: attachment' header.
    if (mode === 'download') {
        return res.redirect(targetUrl);
    }

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch file from GitHub: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        
        // Set headers to allow browser to open file inline
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", "inline");

        // Convert the response to an arrayBuffer and send it
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).send("Error fetching file for inline viewing");
    }
}
