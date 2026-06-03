const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// ─── History / Routing ──────────────────────────────────────────────────────

window.addEventListener("popstate", e => {
    const state = e.state;
    if (!state || state.view === "home")         loadHome(false);
    else if (state.view === "about")             loadAbout(false);
    else if (state.view === "request")           loadRequest(false);
    else if (state.view === "folder")            loadFolder(state.category, state.subFolder, false);
});

// ─── Skeletons ──────────────────────────────────────────────────────────────

function showHomeSkeleton() {
    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            ${Array(4).fill(`
                <div>
                    <div class="card skeleton-home-card">
                        <div class="skeleton-cover skeleton-pulse"></div>
                        <div class="card-text">
                            <div class="skeleton-line skeleton-pulse" style="width:80%;height:14px"></div>
                            <div class="skeleton-line skeleton-pulse" style="width:50%;height:12px;margin-top:8px"></div>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function showFolderSkeleton() {
    app.innerHTML = `
        <div class="breadcrumb-container">
            <div class="skeleton-line skeleton-pulse" style="width:200px;height:16px"></div>
        </div>
        <div class="folder-meta">
            <div class="skeleton-line skeleton-pulse" style="width:100px;height:13px"></div>
        </div>
        <div class="search-container">
            <div class="skeleton-line skeleton-pulse" style="width:100%;height:38px;border-radius:6px"></div>
        </div>
        <div class="grid">
            ${Array(6).fill(`
                <div class="skeleton-file-card skeleton-pulse">
                    <div class="skeleton-line" style="width:70%;height:14px"></div>
                    <div class="skeleton-line" style="width:40%;height:12px;margin-top:10px"></div>
                </div>
            `).join("")}
        </div>
    `;
}

// ─── Home ───────────────────────────────────────────────────────────────────

async function loadHome(push = true) {
    currentCategory = null;
    currentPath = "";

    if (push) history.pushState({ view: "home" }, "");

    showHomeSkeleton();

    const categories = [
        { id: "card1", category: "Books",  img: "/Media/images/Excel_Phy.png",   label: "Read books, pamphlets & notes" },
        { id: "card2", category: "Exams",  img: "/Media/images/MANEB_Maths.png", label: "See exam/test papers" },
        { id: "card4", category: "Zips",   img: "/Media/images/zips.png",         label: "Download zip packages" },
        { id: "card3", category: "Q&A",    img: "/Media/images/Q&A.png",          label: "Study questions & model answers" },
    ];

    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            ${categories.map(c => `
                <div id="${c.id}">
                    <a href="#" class="card" data-category="${c.category}">
                        <img class="cover" src="${c.img}" alt="cover"/>
                        <div class="card-text">
                            <p>${c.label}</p>
                            <span class="file-count" id="count-${c.category}">
                                <span class="skeleton-count skeleton-pulse"></span>
                            </span>
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

// ─── About ──────────────────────────────────────────────────────────────────

function loadAbout(push = true) {
    if (push) history.pushState({ view: "about" }, "");

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

// ─── Request ─────────────────────────────────────────────────────────────────

function loadRequest(push = true) {
    if (push) history.pushState({ view: "request" }, "");

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

// ─── Debounce helper ─────────────────────────────────────────────────────────

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ─── Render file card helper ─────────────────────────────────────────────────

function renderFileCard(file, filePath, isDownloads) {
    const ext = file.split(".").pop().toLowerCase();
    let icon = "📄";
    if (ext === "pdf") icon = "📕";
    else if (ext === "doc" || ext === "docx") icon = "📝";
    else if (ext === "xls" || ext === "xlsx") icon = "📊";
    else if (ext === "ppt" || ext === "pptx") icon = "📽️";
    else if (ext === "zip" || ext === "rar") icon = "🗜️";

    const cleanName = file.replace(/\.[^/.]+$/, "");
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

    return card;
}

// ─── Load Folder ─────────────────────────────────────────────────────────────

async function loadFolder(category, subFolder = "", push = true) {
    currentCategory = category;
    currentPath = subFolder;

    if (push) history.pushState({ view: "folder", category, subFolder }, "");

    showFolderSkeleton();

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
            <input type="text" id="searchInput" placeholder="Search in this folder..." />
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

    function renderFolderContents(folders, files) {
        grid.innerHTML = "";

        folders.forEach(folder => {
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

        files.forEach(file => {
            const filePath = `${category}/${currentPath ? currentPath + '/' : ''}${file}`;
            grid.appendChild(renderFileCard(file, filePath, isDownloads));
        });

        if (folders.length === 0 && files.length === 0) {
            grid.innerHTML = `<p class="empty-state">No files here yet.</p>`;
        }
    }

    renderFolderContents(data.folders, data.files);

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

    // ─── Search (debounced, scoped to current folder) ───────────────────────
    const searchInput = document.getElementById("searchInput");

    const handleSearch = debounce(async () => {
        const query = searchInput.value.trim();

        if (!query) {
            renderFolderContents(data.folders, data.files);
            return;
        }

        grid.innerHTML = `
            ${Array(4).fill(`
                <div class="skeleton-file-card skeleton-pulse">
                    <div class="skeleton-line" style="width:65%;height:14px"></div>
                    <div class="skeleton-line" style="width:35%;height:12px;margin-top:10px"></div>
                </div>
            `).join("")}
        `;

        try {
            const res = await fetch(
                `/api/search?category=${encodeURIComponent(currentCategory)}&query=${encodeURIComponent(query)}&subpath=${encodeURIComponent(currentPath)}`
            );
            const results = await res.json();

            grid.innerHTML = "";

            if (results.length === 0) {
                grid.innerHTML = `<p class="empty-state">No files found for "<strong>${query}</strong>" in this folder.</p>`;
                return;
            }

            results.forEach(item => {
                grid.appendChild(renderFileCard(item.name, item.path, isDownloads));
            });
        } catch {
            grid.innerHTML = `<p class="empty-state">Search failed. Please try again.</p>`;
        }
    }, 350);

    searchInput.addEventListener("input", handleSearch);
}

// ─── Scroll reveal ───────────────────────────────────────────────────────────

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

// ─── Initial load ─────────────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
    // replaceState so the very first entry has a state object too
    history.replaceState({ view: "home" }, "");
    loadHome(false);
});
