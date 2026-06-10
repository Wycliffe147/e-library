const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// ─── Dark Mode ───────────────────────────────────────────────────────────────

function initDarkMode() {
    const saved = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (saved === "true" || (saved === null && prefersDark)) {
        document.documentElement.classList.add("dark");
    }

    const btn = document.getElementById("darkModeToggle");
    if (btn) updateToggleIcon(btn);
}

function updateToggleIcon(btn) {
    const isDark = document.documentElement.classList.contains("dark");
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark);
    const btn = document.getElementById("darkModeToggle");
    if (btn) updateToggleIcon(btn);
}

// ─── Page Transitions ────────────────────────────────────────────────────────

function transitionOut() {
    return new Promise(resolve => {
        app.classList.add("page-exit");
        setTimeout(() => {
            app.classList.remove("page-exit");
            resolve();
        }, 220);
    });
}

function transitionIn() {
    app.classList.add("page-enter");
    // Force reflow
    void app.offsetWidth;
    app.classList.add("page-enter-active");
    setTimeout(() => {
        app.classList.remove("page-enter", "page-enter-active");
    }, 320);
}

async function navigateTo(renderFn, pageTitle) {
    await transitionOut();
    renderFn();
    transitionIn();

    // Track page view in Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: pageTitle || document.title,
            page_location: window.location.href,
            page_path: window.location.pathname + window.location.search + window.location.hash
        });
    }
}

// ─── History / Routing ──────────────────────────────────────────────────────

window.addEventListener("popstate", e => {
    const state = e.state;
    if (!state || state.view === "home") {
        navigateTo(() => loadHome(false), "Home - e-library");
    } else if (state.view === "about") {
        navigateTo(() => loadAbout(false), "About - e-library");
    } else if (state.view === "request") {
        navigateTo(() => loadRequest(false), "Request - e-library");
    } else if (state.view === "folder") {
        const folderTitle = state.subFolder ? `${state.category} > ${state.subFolder}` : state.category;
        navigateTo(() => loadFolder(state.category, state.subFolder, false), `${folderTitle} - e-library`);
    }
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

    if (push) {
        history.pushState({ view: "home" }, "");
        await navigateTo(_renderHome, "Home - e-library");
    } else {
        _renderHome();
    }
}

function _renderHome() {
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

async function loadAbout(push = true) {
    if (push) {
        history.pushState({ view: "about" }, "");
        await navigateTo(_renderAbout, "About - e-library");
    } else {
        _renderAbout();
    }
}

function _renderAbout() {
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

async function loadRequest(push = true) {
    if (push) {
        history.pushState({ view: "request" }, "");
        await navigateTo(_renderRequest, "Request - e-library");
    } else {
        _renderRequest();
    }
}

function _renderRequest() {
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

function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function showZipContents(file, filePath) {
    const modal = document.createElement("div");
    modal.className = "zip-modal";
    modal.innerHTML = `
        <div class="zip-modal-content">
            <div class="zip-modal-header">
                <h3>Contents of ${file}</h3>
                <button class="close-zip-modal">&times;</button>
            </div>
            <div class="zip-modal-body">
                <div class="skeleton-line skeleton-pulse" style="width:100%;height:20px;margin-bottom:10px"></div>
                <div class="skeleton-line skeleton-pulse" style="width:90%;height:20px;margin-bottom:10px"></div>
                <div class="skeleton-line skeleton-pulse" style="width:95%;height:20px;margin-bottom:10px"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".close-zip-modal").onclick = () => {
        document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };

    try {
        const res = await fetch(`/api/zip-contents?file=${encodeURIComponent(filePath)}`);
        if (!res.ok) throw new Error("Failed to load contents");
        const entries = await res.json();

        const body = modal.querySelector(".zip-modal-body");
        if (entries.length === 0) {
            body.innerHTML = "<p>This ZIP file is empty.</p>";
        } else {
            body.innerHTML = `
                <ul class="zip-entry-list">
                    ${entries.map(entry => `
                        <li>
                            <span class="entry-name">${entry.isDirectory ? "📁" : "📄"} ${entry.name}</span>
                            ${!entry.isDirectory ? `<span class="entry-size">${formatBytes(entry.size)}</span>` : ""}
                        </li>
                    `).join("")}
                </ul>
            `;
        }
    } catch (err) {
        modal.querySelector(".zip-modal-body").innerHTML = `<p class="error-text">Error: ${err.message}</p>`;
    }
}

// ─── Render file card helper ─────────────────────────────────────────────────

function renderFileCard(file, filePath, isDownloads, size) {
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

    let openUrl = `/api/download?file=${encodeURIComponent(filePath)}`;
    
    // Use Google Docs Viewer for Office files to allow in-browser viewing
    const officeExts = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    if (officeExts.includes(ext)) {
        const absoluteUrl = window.location.origin + openUrl;
        openUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
    }

    const sizeHTML = size ? `<span class="file-size" style="font-size: 0.8em; opacity: 0.7; margin-left: 5px;">(${formatBytes(size)})</span>` : '';

    const isZip = ext === "zip";

    if (isDownloads) {
        card.innerHTML = `
            <div class="file-top">
                <input type="checkbox" class="file-checkbox" value="${filePath}">
                <span>${icon} ${cleanName} ${sizeHTML}</span>
            </div>
            <div class="file-actions">
                ${isZip ? `<button class="open-zip-btn" data-file="${file}" data-path="${filePath}">View Contents</button>` : ""}
                <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=download" download="${file}">Download</a>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="file-top">
                <input type="checkbox" class="file-checkbox" value="${filePath}">
                <span>${icon} ${cleanName} ${sizeHTML}</span>
            </div>
            <div class="file-actions">
                ${isZip ? 
                    `<button class="open-zip-btn" data-file="${file}" data-path="${filePath}">View Contents</button>` : 
                    `<a href="${openUrl}" target="_blank">Open</a>`
                }
                <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=download" download="${file}">Download</a>
            </div>
        `;
    }

    const zipBtn = card.querySelector(".open-zip-btn");
    if (zipBtn) {
        zipBtn.onclick = () => showZipContents(file, filePath);
    }

    return card;
}

// ─── Load Folder ─────────────────────────────────────────────────────────────

async function loadFolder(category, subFolder = "", push = true) {
    currentCategory = category;
    currentPath = subFolder;

    if (push) {
        history.pushState({ view: "folder", category, subFolder }, "");
        const folderTitle = subFolder ? `${category} > ${subFolder}` : category;
        await navigateTo(() => _renderFolder(category, subFolder), `${folderTitle} - e-library`);
    } else {
        _renderFolder(category, subFolder);
    }
}

async function _renderFolder(category, subFolder) {
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

    function renderFolderContents(folders, files) {
        grid.innerHTML = "";

        folders.forEach(folder => {
            const card = document.createElement("div");
            card.className = "folder-card";
            const folderPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
            
            card.innerHTML = `
                <div class="folder-top">
                    <input type="checkbox" class="folder-checkbox" data-path="${folderPath}" data-name="${folder.name}">
                    <span class="folder-name">📁 ${folder.name}</span>
                </div>
                <span class="folder-count-badge">${folder.count} file${folder.count !== 1 ? "s" : ""}</span>
            `;
            
            // Prevent checkbox click from opening the folder
            const checkbox = card.querySelector(".folder-checkbox");
            checkbox.addEventListener("click", e => e.stopPropagation());

            card.addEventListener("click", () => {
                loadFolder(category, folderPath);
            });
            grid.appendChild(card);
        });

        files.forEach(file => {
            const filePath = `${category}/${currentPath ? currentPath + '/' : ''}${file.name}`;
            grid.appendChild(renderFileCard(file.name, filePath, isDownloads, file.size));
        });

        if (folders.length === 0 && files.length === 0) {
            grid.innerHTML = `<p class="empty-state">No files here yet.</p>`;
        }
    }

    renderFolderContents(data.folders, data.files);

    document.getElementById("downloadSelected").addEventListener("click", async () => {
        const selectedFiles = Array.from(document.querySelectorAll(".file-checkbox:checked")).map(cb => cb.value);
            const selectedFolders = Array.from(document.querySelectorAll(".folder-checkbox:checked"));

            if (!selectedFiles.length && !selectedFolders.length) return alert("No items selected");

            // Show a "Processing..." hint if downloading folders
            if (selectedFolders.length > 0) {
                const btn = document.getElementById("downloadSelected");
                const originalText = btn.textContent;
                btn.textContent = "Processing folders...";
                btn.disabled = true;
                
                try {
                    let allFilePaths = [...selectedFiles];

                    for (const folderCb of selectedFolders) {
                        const folderPath = folderCb.dataset.path;
                        const res = await fetch(`/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(folderPath)}&recursive=true`);
                        const data = await res.json();
                        if (data.files) {
                            allFilePaths = allFilePaths.concat(data.files);
                        }
                    }

                    // Remove duplicates
                    allFilePaths = [...new Set(allFilePaths)].filter(Boolean);

                    if (allFilePaths.length === 0) {
                        alert("No files found in selected folders.");
                    } else {
                        triggerBatchDownload(allFilePaths);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Error gathering folder files.");
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            } else {
                triggerBatchDownload(selectedFiles);
            }
        });

        function triggerBatchDownload(paths) {
            paths.forEach((filePath, index) => {
                setTimeout(() => {
                    const filename = filePath.split("/").pop();
                    const link = document.createElement("a");
                    link.href = `/api/download?file=${encodeURIComponent(filePath)}&mode=download`;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, index * 800);
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
                grid.appendChild(renderFileCard(item.name, item.path, isDownloads, item.size));
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
    history.replaceState({ view: "home" }, "");

    // Wire up dark mode toggle button
    const toggleBtn = document.getElementById("darkModeToggle");
    if (toggleBtn) toggleBtn.addEventListener("click", toggleDarkMode);

    initDarkMode();
    loadHome(false);
});
