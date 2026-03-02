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
                <a href="#" class="card" data-category="books">
                    <img class="cover" src="/Media/images/Excel_Phy.png"/>
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>
            <div id="card2">
                <a href="#" class="card" data-category="exams">
                    <img class="cover" src="/Media/images/MANEB_Maths.png"/>
                    <p>See exam/test papers</p>
                </a>
            </div>
            <div id="card3">
                <a href="#" class="card" data-category="qna">
                    <img class="cover" src="/Media/images/Q&A.png"/>
                    <p>Study questions & model answers</p>
                </a>
            </div>
        </div>
    `;

    document.querySelectorAll('.cards a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            loadFolder(a.dataset.category);
        });
    });
}

window.addEventListener("DOMContentLoaded", loadHome);

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

    // Breadcrumbs
    const parts = ["Home", category, ...subFolder.split("/").filter(Boolean)];
    let breadcrumbHTML = "";
    let pathSoFar = "";

    parts.forEach((part, index) => {
        if (index === 0) {
            breadcrumbHTML += `<span class="breadcrumb">Home</span>`;
        } else {
            pathSoFar = index === 1 ? "" : `${pathSoFar}/${part}`;
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="${pathSoFar}">${part}</span>`;
        }
    });

    app.innerHTML = `
        <div class="breadcrumb-container">${breadcrumbHTML}</div>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search files..." />
        </div>
        <div class="grid"></div>
    `;

    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            const path = e.target.dataset.path;
            if (path === undefined) {
                loadHome();
            } else {
                loadFolder(category, path);
            }
        });
    });

    const grid = document.querySelector(".grid");

    // Folders
    data.folders.forEach(folder => {
        const card = document.createElement("div");
        card.className = "folder-card";
        card.textContent = "📁 " + folder;
        card.addEventListener("click", () => {
            const newPath = currentPath ? `${currentPath}/${folder}` : folder;
            loadFolder(category, newPath);
        });
        grid.appendChild(card);
    });

    // Files
    data.files.forEach(file => {
        const extension = file.split(".").pop().toLowerCase();
        let icon = "📄";
        if (extension === "pdf") icon = "📕";
        if (["doc","docx"].includes(extension)) icon = "📝";
        if (["xls","xlsx"].includes(extension)) icon = "📊";
        if (["ppt","pptx"].includes(extension)) icon = "📽️";

        const cleanName = file.replace(/\.[^/.]+$/, "");

        const card = document.createElement("div");
        card.className = "file-card";
        card.innerHTML = `
            <a href="/Media/${category}/${currentPath ? currentPath + "/" : ""}${file}" target="_blank">
                ${icon} ${cleanName}
            </a>
        `;
        grid.appendChild(card);
    });

    // Search
    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.trim();
        if (!query) {
            loadFolder(currentCategory, currentPath);
            return;
        }

        const res = await fetch(
            `/api/search?category=${encodeURIComponent(currentCategory)}&query=${encodeURIComponent(query)}`
        );

        const results = await res.json();
        grid.innerHTML = "";

        results.forEach(item => {
            const extension = item.name.split(".").pop().toLowerCase();
            let icon = extension === "pdf" ? "📕" : "📄";

            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <a href="/Media/${currentCategory}/${item.path}" target="_blank">
                    ${icon} ${item.name.replace(/\.[^/.]+$/, "")}
                </a>
            `;
            grid.appendChild(card);
        });
    });
}