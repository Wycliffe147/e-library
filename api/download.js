import fs from "fs";
import path from "path";

const mimeTypes = {
    pdf: "application/pdf",
    doc: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    txt: "text/plain"
};

export default function handler(req, res) {
    const { file, mode = "open" } = req.query;

    if (!file) return res.status(400).send("File parameter required");

    const safePath = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(process.cwd(), "Media", safePath);

    if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

    const ext = file.split(".").pop().toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Set headers based on mode
    if (mode === "download") {
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    } else {
        res.setHeader("Content-Disposition", "inline");
    }

    res.setHeader("Content-Type", mimeType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
}