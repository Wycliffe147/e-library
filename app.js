const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// --- Load Home ---
function loadHome() {
    currentCategory = null;
    currentPath = "";

    app.innerHTML = `
        <div class="cards">
            <div id="card1">
                <a href="#" data-category="books">
                    <img class="cover" src="/Media/images/Excel_Phy.png"/>
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>
            <div id="card2">
                <a href="#" data-category="exams">
                    <img class="cover" src="/Media/images/MANEB_Maths.png"/>
                    <p>See exam/test papers</p>
                </a>
            </div>
            <div id="card3">
                <a href="#" data-category="qna">
                    <img class="cover" src="/Media/images/Q&A.png"/>
                    <p>Study questions & model answers</p>
                </a>
            </div>
        </div>
    `;

    // Attach click listeners AFTER rendering
    const links = app.querySelectorAll("a[data-category]");

    links.forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const category = link.dataset.category;
            loadFolder(category);
        });
    });
}

// --- Load Folder ---
async function loadFolder(category, subFolder = "") {
    currentCategory = category;
    currentPath = subFolder;

    const res = await fetch(
        `/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(subFolder)}`
    );

    if (!res.ok) {
        app.innerHTML = `<p>Error loading folder</p>`;
        return;
    }

    const data = await res.json();

    app.innerHTML = `
        <button id="backBtn">⬅ Back</button>
        <div class="grid"></div>
    `;

    document.getElementById("backBtn").addEventListener("click", loadHome);

    const grid = document.querySelector(".grid");

    // Folders
    data.folders.forEach(folder => {
        const div = document.createElement("div");
        div.className = "folder-card";
        div.textContent = "📁 " + folder;

        div.addEventListener("click", () => {
            const newPath = currentPath
                ? `${currentPath}/${folder}`
                : folder;
            loadFolder(category, newPath);
        });

        grid.appendChild(div);
    });

    // Files
    data.files.forEach(file => {
        const div = document.createElement("div");
        div.className = "file-card";

        div.innerHTML = `
            <a href="/Media/${category}/${currentPath ? currentPath + "/" : ""}${file}" target="_blank">
                📄 ${file}
            </a>
        `;

        grid.appendChild(div);
    });
}

// Initial Load
window.addEventListener("DOMContentLoaded", loadHome);