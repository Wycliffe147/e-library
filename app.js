const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ================= PDF THUMBNAIL RENDERER =================
async function renderPDFThumbnail(url, canvas) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.5 });

        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

    } catch (error) {
        console.error("PDF thumbnail error:", error);
    }
}

// ================= HOME =================
function loadHome() {
    currentCategory = null;
    currentPath = "";

    app.innerHTML = `
        <div class="cards" id="homeCardsInApp">
            <div id="card1">
                <a href="#" class="card" data-category="Books">
                    <img class="cover" src="/Media/images/Excel_Phy.png"/>
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>
            <div id="card2">
                <a href="#" class="card" data-category="Exams">
                    <img class="cover" src="/Media/images/MANEB_Maths.png"/>
                    <p>See exam/test papers</p>
                </a>
            </div>
            <div id="card3">
                <a href="#" class="card" data-category="Q&A">
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

// ================= ABOUT =================
function loadAbout() {
    app.innerHTML = `
        <section class="about-section">
            <h2>About This Project</h2>
            <p>This e-library allows students to browse, search, and read educational resources online.</p>

            <div class="about-flex reveal">
                <img src="/Media/images/about.png" class="about-image"/>
                <p>
                    Having this website is better than relying on WhatsApp groups 
                    because documents don't need to be re-sent repeatedly.
                </p>
            </div>

            <p><strong>Technologies:</strong> HTML, CSS, JavaScript, Node.js, Vercel</p>
            <p><strong>Features:</strong> SPA navigation, search, breadcrumbs, PDF thumbnails.</p>

            <div class="developer-card reveal">
                <h3>About the Developer</h3>
                <p>
                    Hi, I'm Wycliffe Mwanganda 👋, a student developer building 
                    practical tech solutions for schools.
                </p>
                <a href="https://wyport.vercel.app" target="_blank">
                    Visit My Portfolio
                </a>
            </div>
        </section>
    `;

    activateScrollReveal();
}

// ================= REQUEST =================
function loadRequest() {
    app.innerHTML = `
        <div class="contact-section">
            <h2>Request a Book / Paper</h2>
            <p>If you want a specific resource added, contact me:</p>
            <ul>
                <li><a href="mailto:wycliffemwanganda@gmail.com">Email</a></li>
                <li><a href="https://wa.me/265984153455" target="_blank">WhatsApp</a></li>
            </ul>
        </div>
    `;
}

// ================= LOAD FOLDER =================
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
        if (index === 0)
            breadcrumbHTML += `<span class="breadcrumb" data-home="true">${part}</span>`;
        else if (index === 1)
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="">${part}</span>`;
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

    // FOLDERS
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

    // FILES
    data.files.forEach(file => {
        const ext = file.split(".").pop().toLowerCase();
        const cleanName = file.replace(/\.[^/.]+$/, "");
        const filePath = `${category}/${currentPath ? currentPath + '/' : ''}${file}`;
        const previewURL = `/api/download?file=${encodeURIComponent(filePath)}&mode=open`;

        const card = document.createElement("div");
        card.className = "file-card";

        // ===== PDF CANVAS THUMBNAIL =====
        if (ext === "pdf") {

            const canvasId = "pdf-" + Math.random().toString(36).substring(2, 9);

            card.innerHTML = `
                <div class="file-preview">
                    <canvas id="${canvasId}" class="pdf-canvas"></canvas>
                </div>

                <div class="file-top">
                    <input type="checkbox" class="file-checkbox" value="${filePath}">
                    <span>${cleanName}</span>
                </div>

                <div class="file-actions">
                    <a href="${previewURL}" target="_blank">Open</a>
                    <a href="${previewURL}&mode=download">Download</a>
                </div>
            `;

            grid.appendChild(card);

            const canvas = document.getElementById(canvasId);
            renderPDFThumbnail(previewURL, canvas);

            return;
        }

        // ===== OTHER FILE TYPES =====
        let icon = "📄";
        if (ext === "doc" || ext === "docx") icon = "📝";
        else if (ext === "xls" || ext === "xlsx") icon = "📊";
        else if (ext === "ppt" || ext === "pptx") icon = "📽️";

        card.innerHTML = `
            <div class="file-top">
                <input type="checkbox" class="file-checkbox" value="${filePath}">
                <span>${icon} ${cleanName}</span>
            </div>
            <div class="file-actions">
                <a href="${previewURL}" target="_blank">Open</a>
                <a href="${previewURL}&mode=download">Download</a>
            </div>
        `;

        grid.appendChild(card);
    });

    // DOWNLOAD SELECTED
    document.getElementById("downloadSelected").addEventListener("click", () => {
        const selected = document.querySelectorAll(".file-checkbox:checked");
        if (!selected.length) return alert("No files selected");

        selected.forEach(cb => {
            const link = document.createElement("a");
            link.href = `/api/download?file=${encodeURIComponent(cb.value)}&mode=download`;
            link.download = "";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    // SEARCH
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
            const previewURL = `/api/download?file=${encodeURIComponent(item.path)}&mode=open`;

            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <div class="file-top">
                    <input type="checkbox" class="file-checkbox" value="${item.path}">
                    <span>📄 ${item.name}</span>
                </div>
                <div class="file-actions">
                    <a href="${previewURL}" target="_blank">Open</a>
                    <a href="${previewURL}&mode=download">Download</a>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// ================= SCROLL REVEAL =================
function activateScrollReveal() {
    const reveals = document.querySelectorAll(".reveal");

    function revealOnScroll() {
        const triggerBottom = window.innerHeight * 0.85;

        reveals.forEach(el => {
            const boxTop = el.getBoundingClientRect().top;
            if (boxTop < triggerBottom) {
                el.classList.add("active");
            }
        });
    }

    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll();
}

// ================= INITIAL LOAD =================
window.addEventListener("DOMContentLoaded", loadHome);