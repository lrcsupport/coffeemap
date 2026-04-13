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
        this.loadState();

        if (localStorage.getItem('onboarding_complete')) {
            document.getElementById('onboarding').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            this.initApp();
        }

        // Handle share target / URL params
        this.handleShareTarget();
    },

    completeOnboarding() {
        localStorage.setItem('onboarding_complete', 'true');
        document.getElementById('onboarding').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this.initApp();
    },

    initApp() {
        CoffeeMap.init();

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

        // Load Google API key
        const googleKey = localStorage.getItem('google_api_key');
        if (googleKey) {
            Geocoding.setGoogleApiKey(googleKey);
            const keyInput = document.getElementById('setting-google-key');
            if (keyInput) keyInput.value = googleKey;
        }

        // Render existing data
        this.renderMarkers();
        this.renderList();
        this.renderRecentAdds();
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

        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${tab}`);
        });

        if (tab === 'map') CoffeeMap.refresh();
        if (tab === 'list') this.renderList();
        if (tab === 'add') this.renderRecentAdds();
        if (tab === 'settings') this.updateStats();
    },

    // ========================
    // Quick Add (paste / type Instagram handle)
    // ========================

    extractHandle(input) {
        if (!input) return null;
        input = input.trim();

        // Extract from Instagram URL (various formats)
        const urlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/i);
        if (urlMatch) return urlMatch[1].toLowerCase();

        // Strip @ prefix
        if (input.startsWith('@')) input = input.substring(1);

        // Validate as a handle
        if (/^[A-Za-z0-9_.]{1,30}$/.test(input)) return input.toLowerCase();

        return null;
    },

    async quickAddHandle(handleOverride) {
        const inputEl = document.getElementById('quick-add-input');
        const statusEl = document.getElementById('quick-add-status');
        const raw = handleOverride || inputEl.value;
        const handle = this.extractHandle(raw);

        if (!handle) {
            statusEl.className = 'add-status error';
            statusEl.textContent = 'Could not find a username. Paste an Instagram link or type a handle.';
            return;
        }

        // Check for duplicate
        if (this.accounts.some(a => a.username === handle)) {
            statusEl.className = 'add-status success';
            statusEl.textContent = `@${handle} is already in your list!`;

            const existing = this.accounts.find(a => a.username === handle);
            if (existing && existing.location) {
                setTimeout(() => {
                    this.switchTab('map');
                    CoffeeMap.flyTo(existing.location.latitude, existing.location.longitude);
                }, 600);
            }
            return;
        }

        // Show loading
        statusEl.className = 'add-status loading';
        statusEl.textContent = `Looking up @${handle}...`;

        // Create account entry
        const account = {
            username: handle,
            profileURL: `https://www.instagram.com/${handle}/`,
            followTimestamp: new Date(),
            isCoffeeShop: true,
            isHidden: false,
            location: null,
            geocodingStatus: 'pending',
        };

        this.accounts.push(account);
        this.saveState();

        // Geocode immediately
        try {
            await Geocoding.geocodeOne(account, LocationService.currentPosition);
            this.saveState();
        } catch (e) {
            console.warn('Geocoding failed for @' + handle, e);
            account.geocodingStatus = 'failed';
            this.saveState();
        }

        // Update all UI
        this.renderMarkers();
        this.renderList();
        this.renderRecentAdds();
        this.updateStats();

        if (account.location) {
            const name = account.location.displayName || this.formatName(handle);
            statusEl.className = 'add-status success';
            statusEl.innerHTML = `&#9989; <strong>${this.escapeHtml(name)}</strong> added and located!`;
            setTimeout(() => {
                this.switchTab('map');
                CoffeeMap.flyTo(account.location.latitude, account.location.longitude);
            }, 1200);
        } else {
            statusEl.className = 'add-status error';
            statusEl.textContent = `@${handle} added, but location couldn't be found. You can retry from Settings.`;
        }

        inputEl.value = '';
    },

    async pasteFromClipboard() {
        const inputEl = document.getElementById('quick-add-input');
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                inputEl.value = text;
                this.quickAddHandle(text);
            }
        } catch (e) {
            // Clipboard API blocked (common on iOS) — fall back to prompt
            const text = prompt('Paste an Instagram URL or handle:');
            if (text) {
                inputEl.value = text;
                this.quickAddHandle(text);
            }
        }
    },

    handleShareTarget() {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get('text') || params.get('url') || params.get('title') || '';

        if (!sharedText) return;

        // Clean URL so reload doesn't re-trigger
        window.history.replaceState({}, '', '/');

        const handle = this.extractHandle(sharedText);
        if (handle) {
            // Auto-complete onboarding if shared from another app
            if (!localStorage.getItem('onboarding_complete')) {
                this.completeOnboarding();
            }
            this.switchTab('add');
            const inputEl = document.getElementById('quick-add-input');
            if (inputEl) inputEl.value = sharedText;
            this.quickAddHandle(sharedText);
        }
    },

    // ========================
    // Recently Added (Add tab)
    // ========================

    renderRecentAdds() {
        const container = document.getElementById('add-recent');
        const listEl = document.getElementById('add-recent-list');
        if (!container || !listEl) return;

        const recent = [...this.accounts]
            .sort((a, b) => new Date(b.followTimestamp) - new Date(a.followTimestamp))
            .slice(0, 10);

        if (recent.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        listEl.innerHTML = recent.map(account => {
            const name = account.location?.displayName || this.formatName(account.username);
            const statusClass = account.geocodingStatus;
            const statusText = account.geocodingStatus === 'resolved'
                ? (account.location?.city || 'Located')
                : account.geocodingStatus === 'failed' ? 'Not found' : 'Pending';

            return `
                <div class="add-recent-item" onclick="app.showDetail(app.accounts.find(a => a.username === '${this.escapeHtml(account.username)}'))">
                    <div class="add-recent-icon">&#9749;</div>
                    <div class="add-recent-info">
                        <div class="add-recent-name">${this.escapeHtml(name)}</div>
                        <div class="add-recent-meta">@${this.escapeHtml(account.username)}</div>
                    </div>
                    <div class="add-recent-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }).join('');
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
        const allPlaces = this.accounts.filter(a => a.isCoffeeShop && !a.isHidden);
        const located = allPlaces.filter(a => a.location);
        const unresolved = allPlaces.filter(a => !a.location);

        if (allPlaces.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">&#9749;</div>
                    <h3>No Places Yet</h3>
                    <p>Tap the <strong>Add</strong> tab to save a place from Instagram.</p>
                </div>
            `;
            return;
        }

        // Sort by distance if user location available
        if (LocationService.currentPosition) {
            located.sort((a, b) => {
                const distA = LocationService.distanceTo(a.location.latitude, a.location.longitude);
                const distB = LocationService.distanceTo(b.location.latitude, b.location.longitude);
                return (distA || Infinity) - (distB || Infinity);
            });
        }

        let html = '';

        for (const account of located) {
            const name = account.location.displayName || this.formatName(account.username);
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
                                ${'&#9733;'.repeat(Math.round(rating))}${'&#9734;'.repeat(5 - Math.round(rating))}
                                <span style="color:#999; margin-left:4px">${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="list-distance">${distText}</div>
                </div>
            `;
        }

        if (unresolved.length > 0) {
            html += `<div class="list-section">Not Yet Located (${unresolved.length})</div>`;
            for (const account of unresolved) {
                const statusIcon = account.geocodingStatus === 'failed' ? '&#9888;&#65039;' : '&#9203;';
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
        const name = loc?.displayName || this.formatName(account.username);

        let distText = '';
        if (loc) {
            const dist = LocationService.distanceTo(loc.latitude, loc.longitude);
            if (dist !== null) distText = LocationService.formatDistance(dist);
        }

        body.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon">&#9749;</div>
                <h2>${this.escapeHtml(name)}</h2>
                <div class="detail-username">@${this.escapeHtml(account.username)}</div>
                ${loc?.rating ? `
                    <div class="list-rating" style="justify-content:center; margin-top:8px">
                        ${'&#9733;'.repeat(Math.round(loc.rating))}${'&#9734;'.repeat(5 - Math.round(loc.rating))}
                        <span style="color:#999; margin-left:4px">${loc.rating.toFixed(1)}</span>
                    </div>
                ` : ''}
            </div>

            ${loc ? `<div id="detail-map-container" class="detail-map"></div>` : ''}

            ${loc ? `
                <div class="detail-info">
                    ${loc.address ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">&#128205;</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Address</div>
                                <div class="detail-row-value">${this.escapeHtml(loc.address)}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${loc.phoneNumber ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">&#128222;</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Phone</div>
                                <div class="detail-row-value"><a href="tel:${loc.phoneNumber}">${this.escapeHtml(loc.phoneNumber)}</a></div>
                            </div>
                        </div>
                    ` : ''}
                    ${loc.websiteURL ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">&#127760;</div>
                            <div class="detail-row-content">
                                <div class="detail-row-label">Website</div>
                                <div class="detail-row-value"><a href="${loc.websiteURL}" target="_blank" rel="noopener">${this.escapeHtml(new URL(loc.websiteURL).hostname)}</a></div>
                            </div>
                        </div>
                    ` : ''}
                    ${distText ? `
                        <div class="detail-row">
                            <div class="detail-row-icon">&#128694;</div>
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
                        &#129517; Get Directions
                    </button>
                ` : ''}
                <button class="btn-instagram" onclick="window.open('${account.profileURL}', '_blank')">
                    &#128247; View on Instagram
                </button>
                <button class="btn btn-danger" style="margin-top:4px;" onclick="app.removePlace('${this.escapeHtml(account.username)}')">
                    Remove Place
                </button>
            </div>
        `;

        modal.classList.remove('hidden');

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
        this.closeDetail();
        this.switchTab('map');
        CoffeeMap.showRoute(lat, lng);

        const pos = LocationService.currentPosition;
        const url = pos
            ? `https://www.google.com/maps/dir/${pos.lat},${pos.lng}/${lat},${lng}`
            : `https://www.google.com/maps/dir//${lat},${lng}`;
        window.open(url, '_blank');
    },

    removePlace(username) {
        if (!confirm(`Remove @${username} from your saved places?`)) return;
        this.accounts = this.accounts.filter(a => a.username !== username);
        this.saveState();
        this.closeDetail();
        this.renderMarkers();
        this.renderList();
        this.renderRecentAdds();
        this.updateStats();
    },

    // ========================
    // Proximity Alerts
    // ========================

    async toggleProximityAlerts() {
        const checkbox = document.getElementById('setting-proximity');
        const btn = document.getElementById('btn-proximity');
        const radiusSetting = document.getElementById('radius-setting');

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

    saveGoogleApiKey(value) {
        const key = value.trim();
        if (key) {
            localStorage.setItem('google_api_key', key);
            Geocoding.setGoogleApiKey(key);
        } else {
            localStorage.removeItem('google_api_key');
            Geocoding.setGoogleApiKey(null);
        }
    },

    updateStats() {
        const all = this.accounts.filter(a => a.isCoffeeShop && !a.isHidden);
        const located = all.filter(a => a.location);
        const pending = all.filter(a => a.geocodingStatus === 'pending');
        const failed = all.filter(a => a.geocodingStatus === 'failed');

        const statCoffee = document.getElementById('stat-coffee');
        const statLocated = document.getElementById('stat-located');
        const statPending = document.getElementById('stat-pending');

        if (statCoffee) statCoffee.textContent = all.length;
        if (statLocated) statLocated.textContent = located.length;
        if (statPending) statPending.textContent = pending.length + failed.length;

        // Show retry button if there are failed geocodes
        const retryBtn = document.getElementById('btn-retry-geocode');
        if (retryBtn) {
            retryBtn.style.display = failed.length > 0 ? '' : 'none';
            retryBtn.textContent = `Retry Failed Locations (${failed.length})`;
        }
    },

    async retryFailedGeocoding() {
        const failed = this.accounts.filter(a => a.geocodingStatus === 'failed');
        if (failed.length === 0) return;

        const btn = document.getElementById('btn-retry-geocode');
        btn.disabled = true;
        btn.textContent = 'Retrying...';

        // Reset failed accounts to pending
        failed.forEach(a => { a.geocodingStatus = 'pending'; });

        await Geocoding.geocodeBatch(this.accounts, LocationService.currentPosition, () => {});
        this.saveState();
        this.renderMarkers();
        this.renderList();
        this.renderRecentAdds();
        this.updateStats();

        btn.disabled = false;
    },

    clearAllData() {
        if (!confirm('Are you sure? This will remove all saved places.')) return;

        this.accounts = [];
        this.saveState();
        CoffeeMap.clearMarkers();
        this.renderList();
        this.renderRecentAdds();
        this.updateStats();
    },

    // ========================
    // Helpers
    // ========================

    getLocatedAccounts() {
        return this.accounts.filter(a =>
            a.isCoffeeShop && !a.isHidden && a.location
        );
    },

    formatName(username) {
        return username
            .replace(/[_.]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
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
