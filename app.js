const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// --- Home ---
async function loadHome() {
    currentCategory = null;
    currentPath = "";

    const categories = [
        { id: "card1", category: "Books",  img: "/Media/images/Excel_Phy.png",   label: "Read books, pamphlets & notes" },
        { id: "card2", category: "Exams",  img: "/Media/images/MANEB_Maths.png", label: "See exam/test papers" },
        { id: "card4", category: "Zips",   img: "/Media/images/zips.png",         label: "Download zip packages" },
        { id: "card3", category: "Q&A",    img: "/Media/images/Q&A.png",          label: "Study questions & model answers" },
    ];

    // Render cards immediately with a loading placeholder for counts
    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            ${categories.map(c => `
                <div id="${c.id}">
                    <a href="#" class="card" data-category="${c.category}">
                        <img class="cover" src="${c.img}" alt="cover"/>
                        <div class="card-text">
                            <p>${c.label}</p>
                            <span class="file-count" id="count-${c.category}">counting...</span>
                        </div>
                    </a>
                </div>
            `).join("")}
        </div>
    `;

    document.querySelectorAll('.cards a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            loadFolder(a.dataset.category);
        });
    });

    // Fetch counts in parallel
    categories.forEach(async ({ category }) => {
        try {
            const res = await fetch(`/api/files?category=${encodeURIComponent(category)}&count=true`);
            const data = await res.json();
            const el = document.getElementById(`count-${category}`);
            if (el) el.textContent = `${data.total} file${data.total !== 1 ? "s" : ""}`;
        } catch {
            const el = document.getElementById(`count-${category}`);
            if (el) el.textContent = "";
        }
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
            <div class="about-flex reveal">
                <img src="/Media/images/about.png" alt="About image" class="about-image" />
                <p>
                    I think having this website is better than relying on WhatsApp groups alone
                    because documents have to be sent every time someone new wants them.
                </p>
            </div>
            <p><strong>Technologies:</strong> HTML, CSS, JavaScript, Node.js, Vercel serverless functions</p>
            <p><strong>Features:</strong> SPA navigation, search functionality, responsive layout, dynamic breadcrumbs.</p>
            <div class="developer-card reveal">
                <h3>About the Developer</h3>
                <p>
                    Hi, I'm Wycliffe Mwanganda 👋, a student developer passionate about building
                    practical tech solutions for schools and any interested institutions.
                </p>
                <a href="https://wyport.vercel.app" target="_blank" class="dev-link">
                    Visit My Portfolio
                </a>
            </div>
        </section>
    `;
    activateScrollReveal();
}

// --- Request ---
function loadRequest() {
    app.innerHTML = `
        <div class="contact-section">
            <h2>Request a Book / Paper</h2>
            <p>If you want a specific book, pamphlet, or exam paper added to the library, reach out:</p>
            <ul>
                <li>Email: <a href="mailto:wycliffemwanganda@gmail.com">Email me</a></li>
                <li>WhatsApp: <a href="https://wa.me/265984153455" target="_blank">Let's talk</a></li>
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

    const isDownloads = category === "Zips";
    const totalFiles = data.files.length;

    app.innerHTML = `
        <div class="breadcrumb-container">${breadcrumbHTML}</div>
        <div class="folder-meta">
            <span class="folder-file-count">${totalFiles} file${totalFiles !== 1 ? "s" : ""} in this folder</span>
        </div>
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search files or folders..." />
        </div>
        ${!isDownloads ? '<button id="downloadSelected">Download Selected</button>' : ''}
        <div class="grid"></div>
    `;

    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            if (e.target.dataset.home) loadHome();
            else loadFolder(category, e.target.dataset.path || "");
        });
    });

    const grid = document.querySelector(".grid");

    // Folders — now objects with { name, count }
    data.folders.forEach(folder => {
        const card = document.createElement("div");
        card.className = "folder-card";
        card.innerHTML = `
            <span class="folder-name">📁 ${folder.name}</span>
            <span class="folder-count-badge">${folder.count} file${folder.count !== 1 ? "s" : ""}</span>
        `;
        card.addEventListener("click", () => {
            const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
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
        else if (ext === "zip" || ext === "rar") icon = "🗜️";

        const cleanName = file.replace(/\.[^/.]+$/, "");
        const filePath = `${category}/${currentPath ? currentPath + '/' : ''}${file}`;

        const card = document.createElement("div");
        card.className = "file-card";

        if (isDownloads) {
            card.innerHTML = `
                <div class="file-top">
                    <span>${icon} ${cleanName}</span>
                </div>
                <div class="file-actions">
                    <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=download" download="${file}">Download</a>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="file-top">
                    <input type="checkbox" class="file-checkbox" value="${filePath}">
                    <span>${icon} ${cleanName}</span>
                </div>
                <div class="file-actions">
                    <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=open" target="_blank">Open</a>
                    <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=download" download="${file}">Download</a>
                </div>
            `;
        }

        grid.appendChild(card);
    });

    if (!isDownloads) {
        document.getElementById("downloadSelected").addEventListener("click", () => {
            const selected = document.querySelectorAll(".file-checkbox:checked");
            if (!selected.length) return alert("No files selected");

            selected.forEach(cb => {
                const filename = cb.value.split("/").pop();
                const link = document.createElement("a");
                link.href = `/api/download?file=${encodeURIComponent(cb.value)}&mode=download`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    }

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
            else if (ext === "zip" || ext === "rar") icon = "🗜️";

            const card = document.createElement("div");
            card.className = "file-card";

            if (isDownloads) {
                card.innerHTML = `
                    <div class="file-top">
                        <span>${icon} ${item.name}</span>
                    </div>
                    <div class="file-actions">
                        <a href="/api/download?file=${encodeURIComponent(item.path)}&mode=download" download="${item.name}">Download</a>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="file-top">
                        <input type="checkbox" class="file-checkbox" value="${item.path}">
                        <span>${icon} ${item.name}</span>
                    </div>
                    <div class="file-actions">
                        <a href="/api/download?file=${encodeURIComponent(item.path)}&mode=open" target="_blank">Open</a>
                        <a href="/api/download?file=${encodeURIComponent(item.path)}&mode=download" download="${item.name}">Download</a>
                    </div>
                `;
            }

            grid.appendChild(card);
        });
    });
}

function activateScrollReveal() {
    const reveals = document.querySelectorAll(".reveal");

    function revealOnScroll() {
        const triggerBottom = window.innerHeight * 0.85;
        reveals.forEach(el => {
            if (el.getBoundingClientRect().top < triggerBottom) {
                el.classList.add("active");
            }
        });
    }

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll();
}

// --- Initial load ---
window.addEventListener("DOMContentLoaded", loadHome);
