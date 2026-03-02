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

// --- About ---
function loadAbout() {
    app.innerHTML = `
        <section class="about-section">
            <h2>About This Project</h2>

            <p>
                This e-library allows students to browse, search, and read educational resources online.
            </p>

            <div class="about-flex">
                <img src="/Media/images/about.png" alt="About image" class="about-image" />
                <p>
                    I think having this website is better than relying on WhatsApp groups alone 
                    because documents have to be sent every time someone new wants them.
                </p>
            </div>

            <p><strong>Technologies:</strong> HTML, CSS, JavaScript, Node.js, Vercel serverless functions</p>
            <p><strong>Features:</strong> SPA navigation, search functionality, responsive layout, dynamic breadcrumbs.</p>
        </section>
    `;
}

// --- Request a Book/Paper ---
function loadRequest() {
    app.innerHTML = `
        <div class="contact-section">
            <h2>Request a Book / Paper</h2>
            <p>If you want a specific book, pamphlet, or exam paper added to the library, reach out:</p>
            <ul>
                <li>Email: 
                    <a href="mailto:wycliffemwanganda@gmail.com">Email me</a>
                </li>
                <li>WhatsApp: 
                    <a href="https://wa.me/265984153455" target="_blank">Let's talk</a>
                </li>
            </ul>
        </div>
    `;
}

// --- Load Folder ---
async function loadFolder(category, subFolder = "") {
    currentCategory = category;
    currentPath = subFolder;

    const res = await fetch(
        `/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(subFolder)}`
    );
    const data = await res.json();

    // Breadcrumbs
    const breadcrumbParts = ["Home", category, ...subFolder.split("/").filter(Boolean)];
    let breadcrumbHTML = "";
    let pathSoFar = "";

    breadcrumbParts.forEach((part, index) => {
        if (index === 0) {
            breadcrumbHTML += `<span class="breadcrumb" data-home="true">${part}</span>`;
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

    // Breadcrumb click handling
    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            if (e.target.dataset.home) {
                loadHome();
            } else {
                const path = e.target.dataset.path || "";
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
        const ext = file.split(".").pop().toLowerCase();
        let icon = "📄";
        if (ext === "pdf") icon = "📕";
        else if (ext === "doc" || ext === "docx") icon = "📝";
        else if (ext === "xls" || ext === "xlsx") icon = "📊";
        else if (ext === "ppt" || ext === "pptx") icon = "📽️";

        const cleanName = file.replace(/\.[^/.]+$/, "");

        const card = document.createElement("div");
        card.className = "file-card";
        card.innerHTML = `
            <a href="/Media/${category}/${currentPath ? currentPath + '/' : ''}${file}" 
               target="_blank" 
               title="${file}">
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
            const ext = item.name.split(".").pop().toLowerCase();
            let icon = "📄";
            if (ext === "pdf") icon = "📕";
            else if (ext === "doc" || ext === "docx") icon = "📝";
            else if (ext === "xls" || ext === "xlsx") icon = "📊";
            else if (ext === "ppt" || ext === "pptx") icon = "📽️";

            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <a href="/Media/${currentCategory}/${item.path}" 
                   target="_blank" 
                   title="${item.name}">
                    ${icon} ${item.name.replace(/\.[^/.]+$/, "")}
                </a>
            `;
            grid.appendChild(card);
        });
    });
}

// --- Initial load ---
window.addEventListener("DOMContentLoaded", loadHome);