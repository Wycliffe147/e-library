import fs from "fs";
import path from "path";

export default function handler(req, res) {
    const { file } = req.query;

    if (!file) return res.status(400).send("File parameter required");

    const safePath = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(process.cwd(), "Media", safePath);

    if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
}
