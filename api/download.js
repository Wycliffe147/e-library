export default async function handler(req, res) {
    const { file, mode } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    const mimeTypes = {
        pdf: "application/pdf",
        zip: "application/zip",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        svg: "image/svg+xml",
        txt: "text/plain",
        html: "text/html",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };

    const ext = file.split(".").pop().toLowerCase();
    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    // e-library-media is public, so we hit GitHub's LFS media CDN directly —
    // no GitHub API lookup, no token, no expiring signed URL needed.
    const sourceUrl = `https://media.githubusercontent.com/media/Wycliffe147/e-library-media/main/${cleanPath}`;

    try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
        }

        const contentType = mimeTypes[ext] || response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);

        // Cache at Vercel's edge so repeat opens/downloads of the same file
        // don't re-cost Fast Origin Transfer on every request.
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

        if (mode === "download") {
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
