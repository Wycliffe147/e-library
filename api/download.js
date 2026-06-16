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

    const ext = file.split(".").pop().toLowerCase();
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
            return res.status(apiResponse.status).send(`Failed to fetch file metadata from GitHub: ${apiResponse.statusText}`);
        }

        const metadata = await apiResponse.json();
        const downloadUrl = metadata.download_url;

        if (!downloadUrl) {
            return res.status(404).send("Download URL not found for this file.");
        }

        // Fetch the actual content from the download URL
        // No token needed here because download_url for private repos includes a temporary token
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch file content: ${response.statusText}`);
        }

        const contentType = mimeTypes[ext] || response.headers.get("content-type") || "application/octet-stream";
        
        res.setHeader("Content-Type", contentType);
        
        if (mode === 'download') {
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.split('/').pop())}"`);
        } else {
            res.setHeader("Content-Disposition", "inline");
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).send("Error fetching file");
    }
}
