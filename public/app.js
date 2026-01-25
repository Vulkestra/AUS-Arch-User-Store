// AUR Store Application
class AURStore {
    constructor() {
        this.ws = null;
        this.installedPackages = new Map();
        this.systemInfo = null;
        this.currentView = 'discover';
        this.searchDebounce = null;
        
        this.init();
    }
    
    async init() {
        this.bindElements();
        this.bindEvents();
        this.connectWebSocket();
        await this.loadSystemInfo();
        await this.loadInstalledPackages();
        this.showView('discover');
    }
    
    bindElements() {
        this.elements = {
            content: document.getElementById('content'),
            searchInput: document.getElementById('searchInput'),
            terminalPanel: document.getElementById('terminalPanel'),
            terminalBody: document.getElementById('terminalBody'),
            toggleTerminal: document.getElementById('toggleTerminal'),
            clearTerminal: document.getElementById('clearTerminal'),
            packageModal: document.getElementById('packageModal'),
            modalContent: document.getElementById('modalContent'),
            toastContainer: document.getElementById('toastContainer'),
            systemStatus: document.getElementById('systemStatus'),
            refreshBtn: document.getElementById('refreshBtn'),
            updateAllBtn: document.getElementById('updateAllBtn'),
            menuToggle: document.getElementById('menuToggle'),
            sidebar: document.querySelector('.sidebar'),
            navItems: document.querySelectorAll('.nav-item')
        };
    }
    
    bindEvents() {
        // Search
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchDebounce);
            this.searchDebounce = setTimeout(() => {
                if (e.target.value.length >= 2) {
                    this.searchPackages(e.target.value);
                } else if (e.target.value.length === 0) {
                    this.showView(this.currentView);
                }
            }, 300);
        });
        
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.length >= 2) {
                this.searchPackages(e.target.value);
            }
        });
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Terminal
        this.elements.toggleTerminal.addEventListener('click', () => this.toggleTerminal());
        this.elements.clearTerminal.addEventListener('click', () => this.clearTerminal());
        
        // Modal
        this.elements.packageModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
        
        // Navigation
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
                this.elements.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                if (window.innerWidth < 769) {
                    this.elements.sidebar.classList.remove('open');
                }
            });
        });
        
        // Refresh
        this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        
        // Update All
        this.elements.updateAllBtn.addEventListener('click', () => this.updateAll());
        
        // Mobile menu
        this.elements.menuToggle.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('open');
        });
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWSMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleWSMessage(data) {
        switch (data.type) {
            case 'start':
                this.openTerminal();
                this.appendTerminal(data.message, 'info');
                break;
            case 'output':
                this.appendTerminal(data.data);
                break;
            case 'complete':
                if (data.success) {
                    this.appendTerminal(data.message, 'success');
                    this.showToast(data.message, 'success');
                    this.loadInstalledPackages();
                } else {
                    this.appendTerminal(data.message, 'error');
                    this.showToast(data.message, 'error');
                }
                break;
            case 'error':
                this.appendTerminal(data.message, 'error');
                this.showToast(data.message, 'error');
                break;
        }
    }
    
    async loadSystemInfo() {
        try {
            const response = await fetch('/api/system');
            this.systemInfo = await response.json();
            
            const statusEl = this.elements.systemStatus;
            const indicator = statusEl.querySelector('.status-indicator');
            const text = statusEl.querySelector('span');
            
            if (this.systemInfo.aurHelper) {
                indicator.classList.add('ready');
                text.textContent = `Ready (${this.systemInfo.aurHelper})`;
            } else {
                indicator.classList.add('error');
                text.textContent = 'No AUR helper found';
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }
    
    async loadInstalledPackages() {
        try {
            const response = await fetch('/api/installed');
            const data = await response.json();
            
            this.installedPackages.clear();
            for (const pkg of data.installed) {
                this.installedPackages.set(pkg.name, pkg.version);
            }
        } catch (error) {
            console.error('Failed to load installed packages:', error);
        }
    }
    
    async showView(view) {
        this.currentView = view;
        this.elements.content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        switch (view) {
            case 'discover':
                await this.showDiscover();
                break;
            case 'browse':
                await this.showBrowse();
                break;
            case 'search':
                this.showSearchView();
                break;
            case 'installed':
                await this.showInstalled();
                break;
            case 'updates':
                await this.showUpdates();
                break;
        }
    }
    
    async showDiscover() {
        try {
            const response = await fetch('/api/popular');
            const data = await response.json();
            
            const featured = data.results.slice(0, 6);
            const popular = data.results.slice(6, 18);
            
            this.elements.content.innerHTML = `
                <div class="hero">
                    <h1 class="hero-title">Discover AUR Packages</h1>
                    <p class="hero-subtitle">Explore thousands of community-maintained packages for Arch Linux</p>
                </div>
                
                <section class="section">
                    <div class="section-header">
                        <h2 class="section-title">Featured</h2>
                    </div>
                    <div class="package-grid">
                        ${featured.map(pkg => this.renderPackageCard(pkg)).join('')}
                    </div>
                </section>
                
                <section class="section">
                    <div class="section-header">
                        <h2 class="section-title">Popular Packages</h2>
                    </div>
                    <div class="package-grid">
                        ${popular.map(pkg => this.renderPackageCard(pkg)).join('')}
                    </div>
                </section>
            `;
            
            this.bindPackageCards();
        } catch (error) {
            this.showError('Failed to load packages');
        }
    }
    
    async showBrowse() {
        const categories = [
            { name: 'Editors', query: 'editor' },
            { name: 'Browsers', query: 'browser' },
            { name: 'Development', query: 'development' },
            { name: 'Gaming', query: 'steam' },
            { name: 'Media', query: 'media player' },
            { name: 'Utilities', query: 'utility' }
        ];
        
        this.elements.content.innerHTML = `
            <div class="hero">
                <h1 class="hero-title">Browse by Category</h1>
                <p class="hero-subtitle">Find packages organized by their purpose</p>
            </div>
            <div class="loading"><div class="spinner"></div></div>
        `;
        
        try {
            const response = await fetch('/api/popular');
            const data = await response.json();
            
            this.elements.content.innerHTML = `
                <div class="hero">
                    <h1 class="hero-title">Browse Packages</h1>
                    <p class="hero-subtitle">All available AUR packages</p>
                </div>
                
                <section class="section">
                    <div class="package-grid">
                        ${data.results.map(pkg => this.renderPackageCard(pkg)).join('')}
                    </div>
                </section>
            `;
            
            this.bindPackageCards();
        } catch (error) {
            this.showError('Failed to load packages');
        }
    }
    
    showSearchView() {
        this.elements.content.innerHTML = `
            <div class="hero">
                <h1 class="hero-title">Search Packages</h1>
                <p class="hero-subtitle">Type in the search bar above to find packages</p>
            </div>
            
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                </div>
                <h3 class="empty-title">Search the AUR</h3>
                <p class="empty-description">Enter at least 2 characters to search for packages</p>
            </div>
        `;
        
        this.elements.searchInput.focus();
    }
    
    async showInstalled() {
        await this.loadInstalledPackages();
        
        if (this.installedPackages.size === 0) {
            this.elements.content.innerHTML = `
                <div class="hero">
                    <h1 class="hero-title">Installed Packages</h1>
                    <p class="hero-subtitle">AUR packages installed on your system</p>
                </div>
                
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                    </div>
                    <h3 class="empty-title">No AUR packages installed</h3>
                    <p class="empty-description">Browse and install packages from the AUR</p>
                </div>
            `;
            return;
        }
        
        // Get info for installed packages
        const packages = [];
        for (const [name, version] of this.installedPackages) {
            packages.push({ Name: name, Version: version });
        }
        
        this.elements.content.innerHTML = `
            <div class="hero">
                <h1 class="hero-title">Installed Packages</h1>
                <p class="hero-subtitle">${packages.length} AUR packages installed</p>
            </div>
            
            <section class="section">
                <div class="package-grid">
                    ${packages.map(pkg => this.renderInstalledCard(pkg)).join('')}
                </div>
            </section>
        `;
        
        this.bindPackageCards();
    }
    
    async showUpdates() {
        this.elements.content.innerHTML = `
            <div class="hero">
                <h1 class="hero-title">Updates</h1>
                <p class="hero-subtitle">Keep your packages up to date</p>
            </div>
            
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                </div>
                <h3 class="empty-title">Check for Updates</h3>
                <p class="empty-description">Click the Update button in the header to check for and install updates</p>
                <button class="btn btn-primary" onclick="app.updateAll()" style="margin-top: 20px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                    Check for Updates
                </button>
            </div>
        `;
    }
    
    async searchPackages(query) {
        this.elements.content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.results.length === 0) {
                this.elements.content.innerHTML = `
                    <div class="hero">
                        <h1 class="hero-title">Search Results</h1>
                        <p class="hero-subtitle">No packages found for "${query}"</p>
                    </div>
                    
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                        <h3 class="empty-title">No results found</h3>
                        <p class="empty-description">Try a different search term</p>
                    </div>
                `;
                return;
            }
            
            this.elements.content.innerHTML = `
                <div class="hero">
                    <h1 class="hero-title">Search Results</h1>
                    <p class="hero-subtitle">${data.results.length} packages found for "${query}"</p>
                </div>
                
                <section class="section">
                    <div class="package-grid">
                        ${data.results.map(pkg => this.renderPackageCard(pkg)).join('')}
                    </div>
                </section>
            `;
            
            this.bindPackageCards();
        } catch (error) {
            this.showError('Search failed');
        }
    }
    
    renderPackageCard(pkg) {
        const isInstalled = this.installedPackages.has(pkg.Name);
        const installedVersion = this.installedPackages.get(pkg.Name);
        const hasUpdate = isInstalled && installedVersion !== pkg.Version;
        
        const icon = this.getPackageIcon(pkg.Name);
        const popularity = pkg.Popularity ? pkg.Popularity.toFixed(2) : '0';
        const votes = pkg.NumVotes || 0;
        const updated = pkg.LastModified ? this.formatDate(pkg.LastModified) : 'Unknown';
        
        return `
            <div class="package-card" data-package="${pkg.Name}">
                <div class="package-header">
                    <div class="package-icon">${icon}</div>
                    ${isInstalled ? `
                        <div class="package-status ${hasUpdate ? 'update' : 'installed'}">
                            ${hasUpdate ? 'Update' : 'Installed'}
                        </div>
                    ` : ''}
                </div>
                <div class="package-name">${pkg.Name}</div>
                <div class="package-version">${pkg.Version}</div>
                <div class="package-description">${pkg.Description || 'No description available'}</div>
                <div class="package-meta">
                    <div class="package-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        ${votes}
                    </div>
                    <div class="package-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20V10"/>
                            <path d="M18 20V4"/>
                            <path d="M6 20v-4"/>
                        </svg>
                        ${popularity}
                    </div>
                    <div class="package-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${updated}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderInstalledCard(pkg) {
        const icon = this.getPackageIcon(pkg.Name);
        
        return `
            <div class="package-card" data-package="${pkg.Name}">
                <div class="package-header">
                    <div class="package-icon">${icon}</div>
                    <div class="package-status installed">Installed</div>
                </div>
                <div class="package-name">${pkg.Name}</div>
                <div class="package-version">${pkg.Version}</div>
                <div class="package-actions">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.showPackageModal('${pkg.Name}')">
                        Info
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.removePackage('${pkg.Name}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }
    
    getPackageIcon(name) {
        const icons = {
            'visual-studio-code': '💻',
            'vscode': '💻',
            'code': '💻',
            'spotify': '🎵',
            'discord': '💬',
            'slack': '💬',
            'chrome': '🌐',
            'firefox': '🦊',
            'brave': '🦁',
            'steam': '🎮',
            'docker': '🐳',
            'git': '📦',
            'nodejs': '💚',
            'python': '🐍',
            'rust': '🦀',
            'go': '🐹',
            'vim': '📝',
            'neovim': '📝',
            'emacs': '📝',
            'vlc': '🎬',
            'obs': '📹',
            'gimp': '🎨',
            'blender': '🎨',
            'nvidia': '🎮',
            'amd': '🔴'
        };
        
        for (const [key, icon] of Object.entries(icons)) {
            if (name.toLowerCase().includes(key)) {
                return icon;
            }
        }
        
        return '📦';
    }
    
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        if (days < 365) return `${Math.floor(days / 30)}mo ago`;
        return `${Math.floor(days / 365)}y ago`;
    }
    
    bindPackageCards() {
        document.querySelectorAll('.package-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.dataset.package;
                this.showPackageModal(name);
            });
        });
    }
    
    async showPackageModal(name) {
        this.elements.packageModal.classList.add('open');
        this.elements.modalContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        try {
            const response = await fetch(`/api/info/${encodeURIComponent(name)}`);
            const data = await response.json();
            const pkg = data.package;
            
            const isInstalled = this.installedPackages.has(pkg.Name);
            const icon = this.getPackageIcon(pkg.Name);
            
            this.elements.modalContent.innerHTML = `
                <div class="modal-header">
                    <div class="modal-icon">${icon}</div>
                    <div class="modal-title-group">
                        <h2 class="modal-title">${pkg.Name}</h2>
                        <div class="modal-subtitle">${pkg.Version}</div>
                    </div>
                    <button class="modal-close" onclick="app.closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <p class="modal-description">${pkg.Description || 'No description available'}</p>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Maintainer</div>
                            <div class="info-value">${pkg.Maintainer || 'Orphaned'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Votes</div>
                            <div class="info-value">${pkg.NumVotes || 0}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Popularity</div>
                            <div class="info-value">${pkg.Popularity ? pkg.Popularity.toFixed(2) : '0'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Last Updated</div>
                            <div class="info-value">${pkg.LastModified ? new Date(pkg.LastModified * 1000).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">First Submitted</div>
                            <div class="info-value">${pkg.FirstSubmitted ? new Date(pkg.FirstSubmitted * 1000).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">License</div>
                            <div class="info-value">${pkg.License ? pkg.License.join(', ') : 'Unknown'}</div>
                        </div>
                    </div>
                    
                    ${pkg.Depends && pkg.Depends.length > 0 ? `
                        <div class="dependency-section">
                            <div class="dependency-title">Dependencies (${pkg.Depends.length})</div>
                            <div class="dependency-list">
                                ${pkg.Depends.map(dep => `<span class="dependency-tag">${dep}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${pkg.MakeDepends && pkg.MakeDepends.length > 0 ? `
                        <div class="dependency-section">
                            <div class="dependency-title">Build Dependencies (${pkg.MakeDepends.length})</div>
                            <div class="dependency-list">
                                ${pkg.MakeDepends.map(dep => `<span class="dependency-tag">${dep}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${pkg.OptDepends && pkg.OptDepends.length > 0 ? `
                        <div class="dependency-section">
                            <div class="dependency-title">Optional Dependencies</div>
                            <div class="dependency-list">
                                ${pkg.OptDepends.map(dep => `<span class="dependency-tag">${dep}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <div class="modal-footer-left">
                        <a href="https://aur.archlinux.org/packages/${pkg.Name}" target="_blank" class="btn btn-secondary btn-sm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            AUR Page
                        </a>
                        ${pkg.URL ? `
                            <a href="${pkg.URL}" target="_blank" class="btn btn-secondary btn-sm">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="2" y1="12" x2="22" y2="12"/>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                                Website
                            </a>
                        ` : ''}
                    </div>
                    <div class="modal-footer-right">
                        ${isInstalled ? `
                            <button class="btn btn-danger" onclick="app.removePackage('${pkg.Name}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Remove
                            </button>
                            <button class="btn btn-primary" onclick="app.installPackage('${pkg.Name}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                    <path d="M3 3v5h5"/>
                                </svg>
                                Reinstall
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="app.installPackage('${pkg.Name}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Install
                            </button>
                        `}
                    </div>
                </div>
            `;
        } catch (error) {
            this.elements.modalContent.innerHTML = `
                <div class="modal-header">
                    <h2 class="modal-title">Error</h2>
                    <button class="modal-close" onclick="app.closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Failed to load package information</p>
                </div>
            `;
        }
    }
    
    closeModal() {
        this.elements.packageModal.classList.remove('open');
    }
    
    installPackage(name) {
        if (!this.systemInfo?.aurHelper) {
            this.showToast('No AUR helper found. Please install yay or paru first.', 'error');
            return;
        }
        
        this.closeModal();
        this.ws.send(JSON.stringify({ action: 'install', package: name }));
    }
    
    removePackage(name) {
        this.closeModal();
        this.ws.send(JSON.stringify({ action: 'remove', package: name }));
    }
    
    updateAll() {
        if (!this.systemInfo?.aurHelper) {
            this.showToast('No AUR helper found. Please install yay or paru first.', 'error');
            return;
        }
        
        this.ws.send(JSON.stringify({ action: 'update' }));
    }
    
    async refresh() {
        await this.loadInstalledPackages();
        this.showView(this.currentView);
        this.showToast('Refreshed', 'success');
    }
    
    toggleTerminal() {
        this.elements.terminalPanel.classList.toggle('open');
    }
    
    openTerminal() {
        this.elements.terminalPanel.classList.add('open');
    }
    
    clearTerminal() {
        this.elements.terminalBody.innerHTML = '<div class="terminal-welcome"><span class="prompt">$</span> Terminal cleared</div>';
    }
    
    appendTerminal(text, type = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        this.elements.terminalBody.appendChild(line);
        this.elements.terminalBody.scrollTop = this.elements.terminalBody.scrollHeight;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    showError(message) {
        this.elements.content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
                <h3 class="empty-title">Error</h3>
                <p class="empty-description">${message}</p>
                <button class="btn btn-primary" onclick="app.refresh()" style="margin-top: 20px;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Initialize app
const app = new AURStore();
