const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// --- Home ---
function loadHome() {
    currentCategory = null;
    currentPath = "";

    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            <div id="card1">
                <a href="#" class="card" data-category="Books">
                    <img class="cover" src="/Media/images/Excel_Phy.png" alt="book-cover_photo"/>
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>
            <div id="card2">
                <a href="#" class="card" data-category="Exams">
                    <img class="cover" src="/Media/images/MANEB_Maths.png" alt="book-cover_photo"/>
                    <p>See exam/test papers</p>
                </a>
            </div>
            <div id="card3">
                <a href="#" class="card" data-category="Q&A">
                    <img class="cover" src="/Media/images/Q&A.png" alt="model questions photo"/>
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

// --- Load Folder ---
async function loadFolder(category, subFolder = "") {
    currentCategory = category;
    currentPath = subFolder;

    const res = await fetch(
        `/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(subFolder)}`
    );
    const data = await res.json();

    const breadcrumbParts = ["Home", category, ...subFolder.split("/").filter(Boolean)];
    let breadcrumbHTML = "";
    let pathSoFar = "";

    breadcrumbParts.forEach((part, index) => {
        if (index === 0) breadcrumbHTML += `<span class="breadcrumb" data-home="true">${part}</span>`;
        else if (index === 1) breadcrumbHTML += ` / <span class="breadcrumb" data-path="">${part}</span>`;
        else {
            pathSoFar += "/" + part;
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="${pathSoFar.slice(1)}">${part}</span>`;
        }
    });

    app.innerHTML = `
        <div class="breadcrumb-container">${breadcrumbHTML}</div>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search files or folders..." />
        </div>
        <button id="downloadSelected">Download Selected</button>
        <div class="grid"></div>
    `;

    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            if (e.target.dataset.home) loadHome();
            else loadFolder(category, e.target.dataset.path || "");
        });
    });

    const grid = document.querySelector(".grid");

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

    data.files.forEach(file => {
        const ext = file.split(".").pop().toLowerCase();
        let icon = "📄";
        if (ext === "pdf") icon = "📕";
        else if (ext === "doc" || ext === "docx") icon = "📝";
        else if (ext === "xls" || ext === "xlsx") icon = "📊";
        else if (ext === "ppt" || ext === "pptx") icon = "📽️";

        const cleanName = file.replace(/\.[^/.]+$/, "");
        const filePath = `${category}/${currentPath ? currentPath + '/' : ''}${file}`;

        const card = document.createElement("div");
        card.className = "file-card";
        card.innerHTML = `
            <div class="file-top">
                <input type="checkbox" class="file-checkbox" value="${filePath}">
                <span>${icon} ${cleanName}</span>
            </div>
            <div class="file-actions">
                <a href="/api/download?file=${encodeURIComponent(filePath)}" target="_blank">Open</a>
                <a href="/api/download?file=${encodeURIComponent(filePath)}" download>Download</a>
            </div>
        `;
        grid.appendChild(card);
    });

    document.getElementById("downloadSelected").addEventListener("click", () => {
        const selected = document.querySelectorAll(".file-checkbox:checked");
        if (!selected.length) return alert("No files selected");

        selected.forEach(cb => {
            const link = document.createElement("a");
            link.href = `/api/download?file=${encodeURIComponent(cb.value)}`;
            link.download = "";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    // --- Search ---
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.trim();
        if (!query) return loadFolder(currentCategory, currentPath);

        const res = await fetch(
            `/api/search?category=${encodeURIComponent(currentCategory)}&query=${encodeURIComponent(query)}`
        );
        const results = await res.json();
        grid.innerHTML = "";

        results.forEach(item => {
            const ext = item.name.split(".").pop().toLowerCase();
            let icon = "📄";
            if (ext === "pdf") icon = "📕";
            else if (ext === "doc" || ext === "docx") icon = "📝";
            else if (ext === "xls" || ext === "xlsx") icon = "📊";
            else if (ext === "ppt" || ext === "pptx") icon = "📽️";

            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <div class="file-top">
                    <input type="checkbox" class="file-checkbox" value="${item.path}">
                    <span>${icon} ${item.name}</span>
                </div>
                <div class="file-actions">
                    <a href="/api/download?file=${encodeURIComponent(item.path)}" target="_blank">Open</a>
                    <a href="/api/download?file=${encodeURIComponent(item.path)}" download>Download</a>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// --- Initial load ---
window.addEventListener("DOMContentLoaded", loadHome);