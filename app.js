const app = document.getElementById("app");

let currentCategory = null;
let currentPath = "";

/* ---------------- HOME ---------------- */

function loadHome() {
    currentCategory = null;
    currentPath = "";

    app.innerHTML = `
        <div class="cards">
            <div>
                <a href="#" class="card" data-category="Books">
                    <img class="cover" 
                         src="/api/download?file=images/Excel_Phy.png&mode=open" />
                    <p>Read books, pamphlets & notes</p>
                </a>
            </div>

            <div>
                <a href="#" class="card" data-category="Exams">
                    <img class="cover" 
                         src="/api/download?file=images/MANEB_Maths.png&mode=open" />
                    <p>See exam/test papers</p>
                </a>
            </div>

            <div>
                <a href="#" class="card" data-category="Q&A">
                    <img class="cover" 
                         src="/api/download?file=images/Q&A.png&mode=open" />
                    <p>Study questions & model answers</p>
                </a>
            </div>
        </div>
    `;

    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", e => {
            e.preventDefault();
            loadFolder(card.dataset.category);
        });
    });
}

/* ---------------- ABOUT ---------------- */

function loadAbout() {
    app.innerHTML = `
        <section class="about-section">
            <h2>About This Project</h2>

            <p>
                This e-library allows students to browse, search,
                and read educational resources online.
            </p>

            <div class="about-flex reveal">
                <img src="/api/download?file=images/about.png&mode=open"
                     class="about-image" />

                <p>
                    I think having this website is better than relying
                    on WhatsApp groups alone because documents have to
                    be sent every time someone new wants them.
                </p>
            </div>

            <p><strong>Technologies:</strong>
            HTML, CSS, JavaScript, Node.js, Vercel serverless functions</p>

            <p><strong>Features:</strong>
            SPA navigation, search functionality, responsive layout,
            dynamic breadcrumbs.</p>

            <div class="developer-card reveal">
                <h3>About the Developer</h3>
                <p>
                    Hi, I'm Wycliffe Mwanganda 👋,
                    a student developer passionate about building
                    practical tech solutions for schools.
                </p>

                <a href="https://wyport.vercel.app"
                   target="_blank"
                   class="dev-link">
                   Visit My Portfolio
                </a>
            </div>
        </section>
    `;

    activateScrollReveal();
}

/* ---------------- REQUEST ---------------- */

function loadRequest() {
    app.innerHTML = `
        <div class="contact-section">
            <h2>Request a Book / Paper</h2>

            <p>
                If you want a specific book, pamphlet,
                or exam paper added to the library, reach out:
            </p>

            <ul>
                <li>Email:
                    <a href="mailto:wycliffemwanganda@gmail.com">
                        Email me
                    </a>
                </li>

                <li>WhatsApp:
                    <a href="https://wa.me/265984153455"
                       target="_blank">
                        Let's talk
                    </a>
                </li>
            </ul>
        </div>
    `;
}

/* ---------------- LOAD FOLDER ---------------- */

async function loadFolder(category, subFolder = "") {
    currentCategory = category;
    currentPath = subFolder;

    const res = await fetch(
        `/api/files?category=${encodeURIComponent(category)}&subpath=${encodeURIComponent(subFolder)}`
    );

    const data = await res.json();

    const breadcrumbParts = [
        "Home",
        category,
        ...subFolder.split("/").filter(Boolean)
    ];

    let breadcrumbHTML = "";
    let pathSoFar = "";

    breadcrumbParts.forEach((part, index) => {
        if (index === 0) {
            breadcrumbHTML += `<span class="breadcrumb" data-home="true">${part}</span>`;
        } else if (index === 1) {
            breadcrumbHTML += ` / <span class="breadcrumb" data-path="">${part}</span>`;
        } else {
            pathSoFar += "/" + part;
            breadcrumbHTML +=
                ` / <span class="breadcrumb" data-path="${pathSoFar.slice(1)}">${part}</span>`;
        }
    });

    app.innerHTML = `
        <div class="breadcrumb-container">${breadcrumbHTML}</div>

        <div class="search-container">
            <input type="text"
                   id="searchInput"
                   placeholder="Search files..." />
        </div>

        <button id="downloadSelected">Download Selected</button>

        <div class="grid"></div>
    `;

    /* Breadcrumb clicks */

    document.querySelectorAll(".breadcrumb").forEach(span => {
        span.addEventListener("click", e => {
            if (e.target.dataset.home) loadHome();
            else loadFolder(category, e.target.dataset.path || "");
        });
    });

    const grid = document.querySelector(".grid");

    /* Folders */

    data.folders.forEach(folder => {
        const card = document.createElement("div");
        card.className = "folder-card";
        card.textContent = "📁 " + folder;

        card.addEventListener("click", () => {
            const newPath =
                currentPath ? `${currentPath}/${folder}` : folder;

            loadFolder(category, newPath);
        });

        grid.appendChild(card);
    });

    /* Files */

    data.files.forEach(file => {
        const ext = file.split(".").pop().toLowerCase();

        let icon = "📄";
        if (ext === "pdf") icon = "📕";
        else if (ext === "doc" || ext === "docx") icon = "📝";
        else if (ext === "xls" || ext === "xlsx") icon = "📊";
        else if (ext === "ppt" || ext === "pptx") icon = "📽️";

        const cleanName = file.replace(/\.[^/.]+$/, "");

        const filePath =
            `${category}/${currentPath ? currentPath + "/" : ""}${file}`;

        const card = document.createElement("div");
        card.className = "file-card";

        card.innerHTML = `
            <div class="file-top">
                <input type="checkbox"
                       class="file-checkbox"
                       value="${filePath}">
                <span>${icon} ${cleanName}</span>
            </div>

            <div class="file-actions">
                <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=open"
                   target="_blank">Open</a>

                <a href="/api/download?file=${encodeURIComponent(filePath)}&mode=download">
                   Download
                </a>
            </div>
        `;

        grid.appendChild(card);
    });

    /* Multi-download */

    document.getElementById("downloadSelected")
        .addEventListener("click", () => {

        const selected =
            document.querySelectorAll(".file-checkbox:checked");

        if (!selected.length) {
            alert("No files selected");
            return;
        }

        selected.forEach(cb => {
            const link = document.createElement("a");
            link.href =
                `/api/download?file=${encodeURIComponent(cb.value)}&mode=download`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    /* Search */

    const searchInput =
        document.getElementById("searchInput");

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

            const ext =
                item.name.split(".").pop().toLowerCase();

            let icon = "📄";
            if (ext === "pdf") icon = "📕";
            else if (ext === "doc" || ext === "docx") icon = "📝";
            else if (ext === "xls" || ext === "xlsx") icon = "📊";
            else if (ext === "ppt" || ext === "pptx") icon = "📽️";

            const card = document.createElement("div");
            card.className = "file-card";

            card.innerHTML = `
                <div class="file-top">
                    <input type="checkbox"
                           class="file-checkbox"
                           value="${item.path}">
                    <span>${icon} ${item.name}</span>
                </div>

                <div class="file-actions">
                    <a href="/api/download?file=${encodeURIComponent(item.path)}&mode=open"
                       target="_blank">Open</a>

                    <a href="/api/download?file=${encodeURIComponent(item.path)}&mode=download">
                       Download
                    </a>
                </div>
            `;

            grid.appendChild(card);
        });
    });
}

/* ---------------- SCROLL REVEAL ---------------- */

function activateScrollReveal() {
    const reveals = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            }
        });
    }, { threshold: 0.2 });

    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
}

/* ---------------- INIT ---------------- */

window.addEventListener("DOMContentLoaded", loadHome);