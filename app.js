const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// --- Load Home Page ---
function loadHome() {
    currentCategory = null;
    currentPath = "";

    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            <div id="card1">
                <a href="#" class="card" data-category="Books">
                    <img class="cover" src="media/images/Excel_Phy.png" alt="book-cover_photo"/>
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>
            <div id="card2">
                <a href="#" class="card" data-category="Exams">
                    <img class="cover" src="media/images/MANEB_Maths.png" alt="book-cover_photo"/>
                    <p>See exam/test papers</p>
                </a>
            </div>
            <div id="card3">
                <a href="#" class="card" data-category="Q&A">
                    <img class="cover" src="media/images/Q&A.png" alt="model questions photo.jpg"/>
                    <p>Study questions & model answers</p>
                </a>
            </div>
        </div>
    `;

    // Add click listeners to cards
    document.querySelectorAll('.cards a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const category = a.dataset.category;
            loadFolder(category);
        });
    });
}

// --- Initial Load ---
window.addEventListener("DOMContentLoaded", loadHome);

// --- Load Folder ---
async function loadFolder(category, subFolder = "") {
    currentCategory = category;
    currentPath = subFolder;

    const res = await fetch(
        `/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(subFolder)}`
    );
    const data = await res.json();

    // --- Breadcrumbs ---
    const breadcrumbParts = ["Home", category, ...subFolder.split("/").filter(Boolean)];
    let breadcrumbHTML = "";
    let pathSoFar = "";

    breadcrumbParts.forEach((part, index) => {
        if (index === 0) {
            breadcrumbHTML += `<span class="breadcrumb">${part}</span>`;
        } else if (index === 1) {
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="">${part}</span>`;
        } else {
            pathSoFar += "/" + part;
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="${pathSoFar.slice(1)}">${part}</span>`;
        }
    });

    app.innerHTML = `
        <div class="breadcrumb-container">${breadcrumbHTML}</div>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search files or folders..." />
        </div>
        <div class="grid"></div>
    `;

    // Breadcrumb click
    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            const path = e.target.dataset.path;
            if (!path) {
                loadHome();
            } else {
                loadFolder(category, path);
            }
        });
    });

    const grid = document.querySelector(".grid");

    // --- Render Folders ---
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

    // --- Render Files ---
    data.files.forEach(file => {
        const extension = file.split(".").pop().toLowerCase();
        let icon = "📄";
        if (extension === "pdf") icon = "📕";
        else if (extension === "doc" || extension === "docx") icon = "📝";
        else if (extension === "xls" || extension === "xlsx") icon = "📊";
        else if (extension === "ppt" || extension === "pptx") icon = "📽️";

        const cleanName = file.replace(/\.[^/.]+$/, "");

        const card = document.createElement("div");
        card.className = "file-card";
        card.innerHTML = `
            <a href="Media/${category}/${currentPath ? currentPath + '/' : ''}${file}" target="_blank" title="${file}">
                ${icon} ${cleanName}
            </a>
        `;
        grid.appendChild(card);
    });

    // --- Search ---
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.trim();
        grid.innerHTML = "";

        if (!query) {
            loadFolder(currentCategory, currentPath);
            return;
        }

        const res = await fetch(
            `/api/search?category=${encodeURIComponent(currentCategory)}&query=${encodeURIComponent(query)}`
        );
        const results = await res.json();

        results.forEach(item => {
            const extension = item.name.split(".").pop().toLowerCase();
            let icon = "📄";
            if (extension === "pdf") icon = "📕";
            else if (extension === "doc" || extension === "docx") icon = "📝";
            else if (extension === "xls" || extension === "xlsx") icon = "📊";
            else if (extension === "ppt" || extension === "pptx") icon = "📽️";

            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <a href="Media/${currentCategory}/${item.path}" target="_blank" title="${item.name}">
                    ${icon} ${item.name.replace(/\.[^/.]+$/, "")}
                </a>
            `;
            grid.appendChild(card);
        });
    });
}