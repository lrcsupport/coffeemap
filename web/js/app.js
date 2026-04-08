/**
 * CoffeeMap — Main App Controller
 * Manages state, UI updates, localStorage persistence, and coordinates all modules.
 */
const app = {
    accounts: [],
    currentTab: 'map',
    searchQuery: '',

    // ========================
    // Initialization
    // ========================

    init() {
        // Load saved state
        this.loadState();

        // Check onboarding
        if (localStorage.getItem('onboarding_complete')) {
            document.getElementById('onboarding').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            this.initApp();
        }
    },

    completeOnboarding() {
        localStorage.setItem('onboarding_complete', 'true');
        document.getElementById('onboarding').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this.initApp();
    },

    initApp() {
        // Initialize map
        CoffeeMap.init();

        // Start location tracking
        LocationService.start(pos => {
            CoffeeMap.updateUserLocation(pos.lat, pos.lng, pos.accuracy);
        });

        // Load proximity settings
        const proximityEnabled = localStorage.getItem('proximity_enabled') === 'true';
        const radius = parseInt(localStorage.getItem('proximity_radius')) || 200;
        document.getElementById('setting-proximity').checked = proximityEnabled;
        document.getElementById('setting-radius').value = radius;
        document.getElementById('radius-value').textContent = radius;
        if (proximityEnabled) {
            document.getElementById('radius-setting').style.display = '';
            document.getElementById('btn-proximity').classList.add('active');
        }
        LocationService.alertRadius = radius;
        LocationService.proximityAlerts = proximityEnabled;

        // Load Google API key if saved
        const googleKey = localStorage.getItem('google_api_key');
        if (googleKey) Geocoding.setGoogleApiKey(googleKey);

        // Render existing data
        this.renderMarkers();
        this.renderList();
        this.renderAccountReview();
        this.updateStats();
    },

    // ========================
    // State Persistence
    // ========================

    saveState() {
        localStorage.setItem('coffee_accounts', JSON.stringify(this.accounts));
    },

    loadState() {
        try {
            const saved = localStorage.getItem('coffee_accounts');
            if (saved) {
                this.accounts = JSON.parse(saved);
                // Restore Date objects
                this.accounts.forEach(a => {
                    if (a.followTimestamp) a.followTimestamp = new Date(a.followTimestamp);
                });
            }
        } catch (e) {
            console.warn('Failed to load saved state:', e);
            this.accounts = [];
        }
    },

    // ========================
    // Tab Navigation
    // ========================

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${tab}`);
        });

        // Refresh map when switching to map tab
        if (tab === 'map') {
            CoffeeMap.refresh();
        }

        // Refresh list when switching to list tab
        if (tab === 'list') {
            this.renderList();
        }

        // Update stats when switching to settings
        if (tab === 'settings') {
            this.updateStats();
        }
    },

    // ========================
    // Instagram Import
    // ========================

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('import-status');
        statusEl.classList.remove('hidden', 'success', 'error');
        statusEl.classList.add('loading');
        statusEl.textContent = 'Parsing file...';

        try {
            const imported = await InstagramImport.parseFile(file);

            if (imported.length === 0) {
                statusEl.classList.remove('loading');
                statusEl.classList.add('error');
                statusEl.textContent = 'No accounts found in this file.';
                return;
            }

            // Merge with existing, skip duplicates
            let newCount = 0;
            let dupeCount = 0;

            for (const account of imported) {
                const exists = this.accounts.some(a => a.username === account.username);
                if (exists) {
                    dupeCount++;
                } else {
                    this.accounts.push(account);
                    newCount++;
                }
            }

            this.saveState();

            statusEl.classList.remove('loading');
            statusEl.classList.add('success');
            statusEl.innerHTML = `&#10003; Import complete! ${newCount} new accounts imported.` +
                (dupeCount > 0 ? ` ${dupeCount} duplicates skipped.` : '');

            this.renderAccountReview();
            this.renderMarkers();
            this.renderList();
            this.updateStats();

        } catch (e) {
            statusEl.classList.remove('loading');
            statusEl.classList.add('error');
            statusEl.textContent = e.message;
        }

        // Reset file input so same file can be re-imported
        event.target.value = '';
    },

    // ========================
    // Account Review
    // ========================

    renderAccountReview() {
        const container = document.getElementById('account-review');
        const listEl = document.getElementById('account-list');

        if (this.accounts.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        document.getElementById('account-count').textContent = this.accounts.length;

        const coffeeCount = this.accounts.filter(a => a.isCoffeeShop).length;
        document.getElementById('coffee-count').textContent = `${coffeeCount} coffee shops`;

        // Render account rows
        listEl.innerHTML = this.accounts.map((account, index) => {
            const statusClass = account.geocodingStatus;
            const statusText = this.getStatusText(account);

            return `
                <div class="account-row">
                    <div class="account-info">
                        <span class="account-username">@${this.escapeHtml(account.username)}</span>
                        <span class="account-status">
                            <span class="status-dot ${statusClass}"></span>
                            ${statusText}
                        </span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" ${account.isCoffeeShop ? 'checked' : ''}
                               onchange="app.toggleCoffeeShop(${index})" />
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        }).join('');

        // Update geocode button
        const pendingCount = this.accounts.filter(a =>
            a.isCoffeeShop && !a.isHidden && a.geocodingStatus === 'pending'
        ).length;

        const btn = document.getElementById('btn-geocode');
        if (pendingCount > 0) {
            btn.classList.remove('hidden');
            btn.textContent = `🔍 Find Locations (${pendingCount} pending)`;
            btn.disabled = false;
        } else {
            btn.style.display = coffeeCount > 0 && this.accounts.some(a => a.geocodingStatus === 'pending') ? '' : 'none';
        }
    },

    toggleCoffeeShop(index) {
        this.accounts[index].isCoffeeShop = !this.accounts[index].isCoffeeShop;
        if (this.accounts[index].isCoffeeShop && !this.accounts[index].location) {
            this.accounts[index].geocodingStatus = 'pending';
        }
        this.saveState();
        this.renderAccountReview();
        this.renderMarkers();
        this.renderList();
        this.updateStats();
    },

    getStatusText(account) {
        switch (account.geocodingStatus) {
            case 'resolved': return account.location?.city || 'Located';
            case 'failed': return 'Location not found';
            case 'pending': return 'Pending';
            default: return '';
        }
    },

    // ========================
    // Geocoding
    // ========================

    async startGeocoding() {
        const btn = document.getElementById('btn-geocode');
        btn.disabled = true;
        btn.textContent = 'Finding locations...';

        const statusEl = document.getElementById('geocoding-status');
        statusEl.classList.remove('hidden');

        await Geocoding.geocodeBatch(
            this.accounts,
            LocationService.currentPosition,
            (progress) => {
                // Update progress UI
                const fill = document.getElementById('geocoding-progress-fill');
                const text = document.getElementById('geocoding-progress-text');
                const current = document.getElementById('geocoding-current');

                fill.style.width = `${progress.progress * 100}%`;
                text.textContent = `${progress.completed}/${progress.total}`;
                current.textContent = progress.current ? `Looking up @${progress.current}...` : '';

                // Save and update markers as we go
                this.saveState();
                this.renderMarkers();
            }
        );

        statusEl.classList.add('hidden');
        btn.disabled = false;

        this.saveState();
        this.renderAccountReview();
        this.renderMarkers();
        this.renderList();
        this.updateStats();
    },

    // ========================
    // Map
    // ========================

    renderMarkers() {
        const located = this.getLocatedAccounts();
        CoffeeMap.setMarkers(located, account => this.showDetail(account));
    },

    filterAccounts(query) {
        this.searchQuery = query;
        CoffeeMap.filterMarkers(query, this.accounts);
    },

    centerOnUser() {
        CoffeeMap.centerOnUser();
    },

    // ========================
    // List
    // ========================

    renderList() {
        const listEl = document.getElementById('coffee-list');
        const coffeeAccounts = this.accounts.filter(a => a.isCoffeeShop && !a.isHidden);
        const located = coffeeAccounts.filter(a => a.location);
        const unresolved = coffeeAccounts.filter(a => !a.location);

        if (coffeeAccounts.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">&#9749;</div>
                    <h3>No Coffee Shops Yet</h3>
                    <p>Import your Instagram data to find coffee shops you follow.</p>
                </div>
            `;
            return;
        }

        // Sort located by distance if we have user location
        if (LocationService.currentPosition) {
            located.sort((a, b) => {
                const distA = LocationService.distanceTo(a.location.latitude, a.location.longitude);
                const distB = LocationService.distanceTo(b.location.latitude, b.location.longitude);
                return (distA || Infinity) - (distB || Infinity);
            });
        }

        let html = '';

        // Located accounts
        for (const account of located) {
            const name = account.location.displayName || LocationService.formatName(account.username);
            const dist = LocationService.distanceTo(account.location.latitude, account.location.longitude);
            const distText = dist !== null ? LocationService.formatDistance(dist) : '';
            const rating = account.location.rating;

            html += `
                <div class="list-item" onclick="app.showDetail(app.accounts.find(a => a.username === '${this.escapeHtml(account.username)}'))">
                    <div class="list-icon">&#9749;</div>
                    <div class="list-info">
                        <div class="list-name">${this.escapeHtml(name)}</div>
                        <div class="list-meta">
                            <span>@${this.escapeHtml(account.username)}</span>
                            ${account.location.city ? `<span>${this.escapeHtml(account.location.city)}</span>` : ''}
                        </div>
                        ${rating ? `
                            <div class="list-rating">
                                ${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}
                                <span style="color:#999; margin-left:4px">${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="list-distance">${distText}</div>
                </div>
            `;
        }

        // Unresolved section
        if (unresolved.length > 0) {
            html += `<div class="list-section">Not Yet Located (${unresolved.length})</div>`;
            for (const account of unresolved) {
                const statusIcon = account.geocodingStatus === 'failed' ? '⚠️' : '⏳';
                const statusText = account.geocodingStatus === 'failed' ? 'Location not found' : 'Pending';

                html += `
                    <div class="list-item">
                        <div class="list-icon">${statusIcon}</div>
                        <div class="list-info">
                            <div class="list-name">@${this.escapeHtml(account.username)}</div>
                            <div class="list-meta"><span>${statusText}</span></div>
                        </div>
                    </div>
                `;
            }
        }

        listEl.innerHTML = html;
    },

    // ========================
    // Detail Modal
    // ========================

    showDetail(account) {
        if (!account) return;

        const modal = document.getElementById('detail-modal');
        const body = document.getElementById('detail-body');
        const loc = account.location;
        const name = loc?.displayName || LocationService.formatName(account.username);

        let distText = '';
        let travelInfo = '';
        if (loc) {
            const dist = LocationService.distanceTo(loc.latitude, loc.longitude);
            if (dist !== null) {
                distText = LocationService.formatDistance(dist);
            }
        }

        body.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon">&#9749;</div>
                <h2>${this.escapeHtml(name)}</h2>
                <div class="detail-username">@${this.escapeHtml(account.username)}</div>
                ${loc?.rating ? `
                    <div class="list-rating" style="justify-content:center; margin-top:8px">
                        ${'★'.repeat(Math.round(loc.rating))}${'☆'.repeat(5 - Math.round(loc.rating))}
                        <span style="color:#999; margin-left:4px">${loc.rating.toFixed(1)}</span>
                    </div>
                ` : ''}
            </div>

            ${loc ? `<div id="detail-map-container" class="detail-map"></div>` : ''}

            ${loc ? `
                <div class="detail-info">
                    ${loc.address ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">📍</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Address</div>
                                <div class="detail-row-value">${this.escapeHtml(loc.address)}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${loc.phoneNumber ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">📞</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Phone</div>
                                <div class="detail-row-value"><a href="tel:${loc.phoneNumber}">${this.escapeHtml(loc.phoneNumber)}</a></div>
                            </div>
                        </div>
                    ` : ''}
                    ${loc.websiteURL ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">🌐</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Website</div>
                                <div class="detail-row-value"><a href="${loc.websiteURL}" target="_blank" rel="noopener">${this.escapeHtml(new URL(loc.websiteURL).hostname)}</a></div>
                            </div>
                        </div>
                    ` : ''}
                    ${distText ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">🚶</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Distance</div>
                                <div class="detail-row-value">${distText}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div class="detail-actions">
                ${loc ? `
                    <button class="btn-directions" onclick="app.getDirections(${loc.latitude}, ${loc.longitude})">
                        🧭 Get Directions
                    </button>
                ` : ''}
                <button class="btn-instagram" onclick="window.open('${account.profileURL}', '_blank')">
                    📷 View on Instagram
                </button>
            </div>
        `;

        modal.classList.remove('hidden');

        // Create detail mini-map
        if (loc) {
            setTimeout(() => {
                CoffeeMap.createDetailMap('detail-map-container', loc.latitude, loc.longitude);
            }, 100);
        }
    },

    closeDetail() {
        document.getElementById('detail-modal').classList.add('hidden');
        if (CoffeeMap.detailMap) {
            CoffeeMap.detailMap.remove();
            CoffeeMap.detailMap = null;
        }
    },

    getDirections(lat, lng) {
        // Close modal and switch to map
        this.closeDetail();
        this.switchTab('map');

        // Show route on map
        CoffeeMap.showRoute(lat, lng);

        // Also open in external maps app (Google Maps or Apple Maps)
        const pos = LocationService.currentPosition;
        if (pos) {
            const url = `https://www.google.com/maps/dir/${pos.lat},${pos.lng}/${lat},${lng}`;
            window.open(url, '_blank');
        } else {
            const url = `https://www.google.com/maps/dir//${lat},${lng}`;
            window.open(url, '_blank');
        }
    },

    // ========================
    // Proximity Alerts
    // ========================

    async toggleProximityAlerts() {
        const checkbox = document.getElementById('setting-proximity');
        const btn = document.getElementById('btn-proximity');
        const radiusSetting = document.getElementById('radius-setting');

        // Toggle based on which element triggered
        const enabled = checkbox.checked;

        await LocationService.enableProximityAlerts(enabled);

        checkbox.checked = enabled;
        btn.classList.toggle('active', enabled);
        radiusSetting.style.display = enabled ? '' : 'none';

        localStorage.setItem('proximity_enabled', enabled.toString());
    },

    updateRadius(value) {
        const meters = parseInt(value);
        document.getElementById('radius-value').textContent = meters;
        LocationService.setAlertRadius(meters);
        localStorage.setItem('proximity_radius', meters.toString());
    },

    // ========================
    // Settings
    // ========================

    updateStats() {
        const coffee = this.accounts.filter(a => a.isCoffeeShop && !a.isHidden);
        const located = coffee.filter(a => a.location);
        const pending = coffee.filter(a => a.geocodingStatus === 'pending');

        const statCoffee = document.getElementById('stat-coffee');
        const statLocated = document.getElementById('stat-located');
        const statPending = document.getElementById('stat-pending');

        if (statCoffee) statCoffee.textContent = coffee.length;
        if (statLocated) statLocated.textContent = located.length;
        if (statPending) statPending.textContent = pending.length;
    },

    clearAllData() {
        if (!confirm('Are you sure? This will remove all imported accounts and locations.')) return;

        this.accounts = [];
        this.saveState();
        CoffeeMap.clearMarkers();
        this.renderList();
        this.renderAccountReview();
        this.updateStats();

        const statusEl = document.getElementById('import-status');
        statusEl.classList.remove('hidden', 'loading', 'error');
        statusEl.classList.add('success');
        statusEl.textContent = 'All data cleared.';
    },

    // ========================
    // Helpers
    // ========================

    getLocatedAccounts() {
        return this.accounts.filter(a =>
            a.isCoffeeShop && !a.isHidden && a.location
        );
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make app globally accessible
window.app = app;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => app.init());

// Handle modal close on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') {
        app.closeDetail();
    }
});

// Handle Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        app.closeDetail();
    }
});
