// Mock AUR package data
const mockPackages = [
    {
        name: "visual-studio-code-bin",
        version: "1.85.1-1",
        description: "Visual Studio Code is a lightweight source code editor",
        category: "development",
        votes: 2456,
        popularity: 98,
        lastUpdated: "2024-01-20",
        maintainer: "Microsoft",
        dependencies: ["electron", "nodejs"],
        size: "1.2 GB",
        license: "MIT"
    },
    {
        name: "spotify",
        version: "1.2.25.1011.g9425d617-1",
        description: "A proprietary music streaming service",
        category: "multimedia",
        votes: 1876,
        popularity: 92,
        lastUpdated: "2024-01-19",
        maintainer: "Spotify Team",
        dependencies: ["libcurl-gnutls", "nss"],
        size: "350 MB",
        license: "Custom"
    },
    {
        name: "discord",
        version: "0.0.28-1",
        description: "All-in-one voice and text chat for gamers",
        category: "utilities",
        votes: 3245,
        popularity: 95,
        lastUpdated: "2024-01-18",
        maintainer: "Discord Team",
        dependencies: ["libappindicator-gtk3", "libxss"],
        size: "280 MB",
        license: "MIT"
    },
    {
        name: "docker",
        version: "24.0.7-1",
        description: "Pack, ship and run any application as a lightweight container",
        category: "system",
        votes: 1234,
        popularity: 88,
        lastUpdated: "2024-01-17",
        maintainer: "Docker Team",
        dependencies: ["containerd", "runc"],
        size: "450 MB",
        license: "Apache"
    },
    {
        name: "steam",
        version: "1.0.0.78-1",
        description: "Valve's digital software delivery platform",
        category: "games",
        votes: 4567,
        popularity: 96,
        lastUpdated: "2024-01-16",
        maintainer: "Valve",
        dependencies: ["lib32-libcurl-gnutls", "lib32-libx11"],
        size: "2.1 GB",
        license: "Custom"
    },
    {
        name: "git",
        version: "2.43.0-1",
        description: "Fast, scalable, distributed revision control system",
        category: "development",
        votes: 890,
        popularity: 85,
        lastUpdated: "2024-01-15",
        maintainer: "Git Team",
        dependencies: ["curl", "expat"],
        size: "45 MB",
        license: "GPL2"
    },
    {
        name: "firefox",
        version: "122.0-1",
        description: "Standalone web browser from mozilla.org",
        category: "utilities",
        votes: 2345,
        popularity: 90,
        lastUpdated: "2024-01-14",
        maintainer: "Mozilla Team",
        dependencies: ["gtk3", "libpulse"],
        size: "380 MB",
        license: "MPL"
    },
    {
        name: "vlc",
        version: "3.0.20-1",
        description: "Multi-platform MPEG, DVD, and DivX player",
        category: "multimedia",
        votes: 1678,
        popularity: 87,
        lastUpdated: "2024-01-13",
        maintainer: "VideoLAN Team",
        dependencies: ["qt5-base", "libx11"],
        size: "120 MB",
        license: "GPL2"
    },
    {
        name: "nodejs",
        version: "21.6.1-1",
        description: "Evented I/O for V8 JavaScript",
        category: "development",
        votes: 1456,
        popularity: 82,
        lastUpdated: "2024-01-12",
        maintainer: "Node.js Team",
        dependencies: ["openssl", "zlib"],
        size: "35 MB",
        license: "MIT"
    },
    {
        name: "python",
        version: "3.11.6-1",
        description: "High-level programming language",
        category: "development",
        votes: 2234,
        popularity: 91,
        lastUpdated: "2024-01-11",
        maintainer: "Python Team",
        dependencies: ["libffi", "openssl"],
        size: "85 MB",
        license: "PSF"
    },
    {
        name: "kitty",
        version: "0.32.2-1",
        description: "Fast, feature-rich, GPU based terminal emulator",
        category: "system",
        votes: 987,
        popularity: 79,
        lastUpdated: "2024-01-10",
        maintainer: "Kitty Team",
        dependencies: ["glfw", "freetype2"],
        size: "25 MB",
        license: "GPL3"
    },
    {
        name: "obs-studio",
        version: "30.0.0-1",
        description: "Free and open source software for live streaming and screen recording",
        category: "multimedia",
        votes: 1876,
        popularity: 86,
        lastUpdated: "2024-01-09",
        maintainer: "OBS Team",
        dependencies: ["qt5-base", "ffmpeg"],
        size: "420 MB",
        license: "GPL2"
    }
];

// Application state
let currentPackages = [...mockPackages];
let filteredPackages = [...mockPackages];
let currentCategory = 'all';
let currentSort = 'popular';
let displayedCount = 6;

// DOM elements
const packagesGrid = document.getElementById('packagesGrid');
const searchInput = document.getElementById('searchInput');
const categoryItems = document.querySelectorAll('.category-item');
const sortItems = document.querySelectorAll('.sort-item');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const packageModal = document.getElementById('packageModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalInstall = document.getElementById('modalInstall');
const installBtn = document.getElementById('installBtn');

// Initialize the app
function init() {
    renderPackages();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Category filtering
    categoryItems.forEach(item => {
        item.addEventListener('click', () => handleCategoryChange(item));
    });
    
    // Sort functionality
    sortItems.forEach(item => {
        item.addEventListener('click', () => handleSortChange(item));
    });
    
    // Load more
    loadMoreBtn.addEventListener('click', loadMorePackages);
    
    // Modal controls
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalInstall.addEventListener('click', handleInstall);
    packageModal.addEventListener('click', (e) => {
        if (e.target === packageModal) closeModal();
    });
    
    // Install button
    installBtn.addEventListener('click', () => {
        showNotification('Opening package installer...', 'info');
    });
}

// Render packages
function renderPackages() {
    const packagesToShow = filteredPackages.slice(0, displayedCount);
    
    packagesGrid.innerHTML = packagesToShow.map(pkg => `
        <div class="package-card" data-package="${pkg.name}">
            <div class="package-header">
                <div>
                    <div class="package-name">${pkg.name}</div>
                    <div class="package-version">${pkg.version}</div>
                </div>
            </div>
            <div class="package-description">${pkg.description}</div>
            <div class="package-meta">
                <div class="package-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 4v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${formatDate(pkg.lastUpdated)}
                </div>
                <div class="package-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2l2.5 5H14l-4 3.5L12.5 16 8 12.5 3.5 16 5 10.5 1 7.5h3.5L8 2Z" fill="currentColor"/>
                    </svg>
                    ${pkg.votes}
                </div>
                <div class="package-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM8 4v4l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${pkg.size}
                </div>
            </div>
            <div class="package-actions">
                <button class="package-button" onclick="showPackageDetails('${pkg.name}')">Details</button>
                <button class="package-button primary" onclick="quickInstall('${pkg.name}')">Install</button>
            </div>
        </div>
    `).join('');
    
    // Update load more button
    if (displayedCount >= filteredPackages.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
    
    // Add click handlers to package cards
    document.querySelectorAll('.package-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.package-button')) {
                const packageName = card.dataset.package;
                showPackageDetails(packageName);
            }
        });
    });
}

// Handle search
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    if (query === '') {
        filteredPackages = currentPackages.filter(pkg => 
            currentCategory === 'all' || pkg.category === currentCategory
        );
    } else {
        filteredPackages = currentPackages.filter(pkg => {
            const matchesSearch = pkg.name.toLowerCase().includes(query) || 
                                 pkg.description.toLowerCase().includes(query);
            const matchesCategory = currentCategory === 'all' || pkg.category === currentCategory;
            return matchesSearch && matchesCategory;
        });
    }
    
    displayedCount = 6;
    sortPackages();
    renderPackages();
}

// Handle category change
function handleCategoryChange(item) {
    // Update active state
    categoryItems.forEach(cat => cat.classList.remove('active'));
    item.classList.add('active');
    
    // Update category and filter
    currentCategory = item.dataset.category;
    filterPackages();
}

// Handle sort change
function handleSortChange(item) {
    // Update active state
    sortItems.forEach(sort => sort.classList.remove('active'));
    item.classList.add('active');
    
    // Update sort and re-render
    currentSort = item.dataset.sort;
    sortPackages();
    renderPackages();
}

// Filter packages by category
function filterPackages() {
    if (currentCategory === 'all') {
        filteredPackages = [...currentPackages];
    } else {
        filteredPackages = currentPackages.filter(pkg => pkg.category === currentCategory);
    }
    
    // Apply search filter if active
    const searchQuery = searchInput.value.toLowerCase();
    if (searchQuery) {
        filteredPackages = filteredPackages.filter(pkg => 
            pkg.name.toLowerCase().includes(searchQuery) || 
            pkg.description.toLowerCase().includes(searchQuery)
        );
    }
    
    displayedCount = 6;
    sortPackages();
    renderPackages();
}

// Sort packages
function sortPackages() {
    switch (currentSort) {
        case 'name':
            filteredPackages.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'updated':
            filteredPackages.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
            break;
        case 'votes':
            filteredPackages.sort((a, b) => b.votes - a.votes);
            break;
        case 'popular':
        default:
            filteredPackages.sort((a, b) => b.popularity - a.popularity);
            break;
    }
}

// Load more packages
function loadMorePackages() {
    displayedCount = Math.min(displayedCount + 6, filteredPackages.length);
    renderPackages();
}

// Show package details modal
function showPackageDetails(packageName) {
    const pkg = currentPackages.find(p => p.name === packageName);
    if (!pkg) return;
    
    modalTitle.textContent = pkg.name;
    modalBody.innerHTML = `
        <div class="package-details">
            <div class="detail-section">
                <h3>Description</h3>
                <p>${pkg.description}</p>
            </div>
            
            <div class="detail-section">
                <h3>Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Version:</span>
                        <span class="detail-value">${pkg.version}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${pkg.category}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${pkg.size}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">License:</span>
                        <span class="detail-value">${pkg.license}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Maintainer:</span>
                        <span class="detail-value">${pkg.maintainer}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Updated:</span>
                        <span class="detail-value">${formatDate(pkg.lastUpdated)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Votes:</span>
                        <span class="detail-value">${pkg.votes}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Popularity:</span>
                        <span class="detail-value">${pkg.popularity}%</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Dependencies</h3>
                <div class="dependencies">
                    ${pkg.dependencies.map(dep => `
                        <span class="dependency-tag">${dep}</span>
                    `).join('')}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Installation Commands</h3>
                <div class="command-block">
                    <code>yay -S ${pkg.name}</code>
                    <button class="copy-button" onclick="copyToClipboard('yay -S ${pkg.name}')">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M5 3v8h6V3H5ZM3 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Z" fill="currentColor"/>
                            <path d="M9 14v1H6v-1h3Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="command-block">
                    <code>paru -S ${pkg.name}</code>
                    <button class="copy-button" onclick="copyToClipboard('paru -S ${pkg.name}')">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M5 3v8h6V3H5ZM3 2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Z" fill="currentColor"/>
                            <path d="M9 14v1H6v-1h3Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    packageModal.classList.add('active');
}

// Quick install
function quickInstall(packageName) {
    const pkg = currentPackages.find(p => p.name === packageName);
    if (!pkg) return;
    
    showNotification(`Installing ${packageName}...`, 'success');
    
    // Simulate installation process
    setTimeout(() => {
        showNotification(`${packageName} installed successfully!`, 'success');
    }, 2000);
}

// Handle install from modal
function handleInstall() {
    const packageName = modalTitle.textContent;
    closeModal();
    quickInstall(packageName);
}

// Close modal
function closeModal() {
    packageModal.classList.remove('active');
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Command copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy command', 'error');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add notification styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                padding: 1rem 1.5rem;
                background: var(--surface);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                color: var(--text-primary);
                font-weight: 500;
                z-index: 3000;
                opacity: 0;
                transform: translateX(100%);
                transition: var(--transition);
                box-shadow: var(--shadow);
            }
            
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification.success {
                border-color: #34C759;
                background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.05));
            }
            
            .notification.error {
                border-color: #FF3B30;
                background: linear-gradient(135deg, rgba(255, 59, 48, 0.1), rgba(255, 59, 48, 0.05));
            }
            
            .notification.info {
                border-color: var(--primary-color);
                background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(0, 122, 255, 0.05));
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Add modal styles
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .package-details {
        color: var(--text-primary);
    }
    
    .detail-section {
        margin-bottom: 2rem;
    }
    
    .detail-section h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--text-primary);
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--surface-secondary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    
    .detail-label {
        font-weight: 500;
        color: var(--text-secondary);
    }
    
    .detail-value {
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .dependencies {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .dependency-tag {
        padding: 0.5rem 1rem;
        background: var(--surface-secondary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        font-size: 0.875rem;
        color: var(--text-primary);
        font-weight: 500;
    }
    
    .command-block {
        position: relative;
        margin-bottom: 1rem;
    }
    
    .command-block code {
        display: block;
        padding: 1rem;
        background: var(--surface-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
        color: var(--text-primary);
        overflow-x: auto;
    }
    
    .copy-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: var(--surface-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 0.5rem;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition);
    }
    
    .copy-button:hover {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
    }
`;
document.head.appendChild(modalStyles);

// Initialize the application
init();