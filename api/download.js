export default function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).send("File parameter required");
    }

    // Git LFS tracked extensions (based on .gitattributes)
    const lfsExtensions = ["pdf", "zip"];
    const ext = file.split(".").pop().toLowerCase();

    // GitHub Host Selection:
    // - media.githubusercontent.com serves the actual content for LFS-tracked files.
    // - raw.githubusercontent.com serves the actual content for normal files (but only pointers for LFS files).
    const host = lfsExtensions.includes(ext)
        ? "https://media.githubusercontent.com/media"
        : "https://raw.githubusercontent.com";

    const user = "Wycliffe147";
    const repo = "e-library";
    const branch = "main";

    // Clean and encode the path correctly to handle subfolders and spaces
    const cleanPath = file.split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    const redirectUrl = `${host}/${user}/${repo}/${branch}/Media/${cleanPath}`;

    // Redirect the user to GitHub to handle the download/viewing
    res.redirect(redirectUrl);
}
