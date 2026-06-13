export default async function handler(req, res) {
    const { file, mode } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    const mimeTypes = {
        "pdf": "application/pdf",
        "zip": "application/zip",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "txt": "text/plain",
        "html": "text/html",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };

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

    const targetUrl = `${host}/${user}/${repo}/${branch}/public/Media/${cleanPath}`;

    if (mode === 'download') {
        return res.redirect(targetUrl);
    }

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch file from GitHub: ${response.statusText}`);
        }

        // Use our mapper, fallback to the response's type, then to octet-stream
        const contentType = mimeTypes[ext] || response.headers.get("content-type") || "application/octet-stream";
        
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", "inline");

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).send("Error fetching file for inline viewing");
    }
}
