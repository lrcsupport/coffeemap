/**
 * Map Module
 * Manages the Leaflet map, markers, routing, and interactions.
 */
const CoffeeMap = {
    map: null,
    markers: new Map(), // username -> L.Marker
    userMarker: null,
    userAccuracyCircle: null,
    routingControl: null,
    markerGroup: null,
    detailMap: null,

    /**
     * Initializes the Leaflet map.
     */
    init() {
        this.map = L.map('map', {
            center: [39.8283, -98.5795], // Center of US
            zoom: 4,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.map);

        this.markerGroup = L.featureGroup().addTo(this.map);

        // Fix map rendering after tab switch
        setTimeout(() => this.map.invalidateSize(), 100);
    },

    /**
     * Ensures the map renders correctly (call after showing the map tab).
     */
    refresh() {
        if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 50);
        }
    },

    /**
     * Updates or creates the user's location marker.
     */
    updateUserLocation(lat, lng, accuracy) {
        if (!this.map) return;

        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
            if (this.userAccuracyCircle) {
                this.userAccuracyCircle.setLatLng([lat, lng]);
                this.userAccuracyCircle.setRadius(accuracy || 50);
            }
        } else {
            const userIcon = L.divIcon({
                className: 'user-marker-wrapper',
                html: '<div class="user-marker"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
                .addTo(this.map);

            this.userAccuracyCircle = L.circle([lat, lng], {
                radius: accuracy || 50,
                color: '#4285f4',
                fillColor: '#4285f4',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(this.map);
        }
    },

    /**
     * Centers the map on the user's current location.
     */
    centerOnUser() {
        const pos = LocationService.currentPosition;
        if (pos && this.map) {
            this.map.setView([pos.lat, pos.lng], 14);
        }
    },

    /**
     * Adds or updates a coffee shop marker on the map.
     */
    addMarker(account, onClick) {
        if (!account.location || !this.map) return;

        const { latitude, longitude } = account.location;

        // Remove existing marker
        if (this.markers.has(account.username)) {
            this.markerGroup.removeLayer(this.markers.get(account.username));
        }

        const icon = L.divIcon({
            className: 'coffee-marker-wrapper',
            html: '<div class="coffee-marker">&#9749;</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const name = account.location.displayName || LocationService.formatName(account.username);
        const marker = L.marker([latitude, longitude], { icon })
            .bindPopup(`<strong>${this.escapeHtml(name)}</strong><br>@${this.escapeHtml(account.username)}`)
            .on('click', () => {
                if (onClick) onClick(account);
            });

        this.markerGroup.addLayer(marker);
        this.markers.set(account.username, marker);
    },

    /**
     * Removes all coffee markers from the map.
     */
    clearMarkers() {
        this.markerGroup.clearLayers();
        this.markers.clear();
    },

    /**
     * Replaces all markers with the given accounts.
     */
    setMarkers(accounts, onClick) {
        this.clearMarkers();
        for (const account of accounts) {
            if (account.location && account.isCoffeeShop && !account.isHidden) {
                this.addMarker(account, onClick);
            }
        }

        // Fit map to show all markers
        if (this.markerGroup.getLayers().length > 0) {
            this.map.fitBounds(this.markerGroup.getBounds().pad(0.1));
        }
    },

    /**
     * Filters visible markers based on a search query.
     */
    filterMarkers(query, accounts) {
        const lowered = query.toLowerCase();
        this.markers.forEach((marker, username) => {
            const account = accounts.find(a => a.username === username);
            if (!account) return;

            const matches = !query ||
                username.includes(lowered) ||
                (account.location?.displayName || '').toLowerCase().includes(lowered) ||
                (account.location?.city || '').toLowerCase().includes(lowered);

            if (matches) {
                if (!this.markerGroup.hasLayer(marker)) {
                    this.markerGroup.addLayer(marker);
                }
            } else {
                this.markerGroup.removeLayer(marker);
            }
        });
    },

    /**
     * Shows a route from user's location to a destination.
     */
    showRoute(destLat, destLng) {
        const pos = LocationService.currentPosition;
        if (!pos || !this.map) return;

        this.clearRoute();

        this.routingControl = L.Routing.control({
            waypoints: [
                L.latLng(pos.lat, pos.lng),
                L.latLng(destLat, destLng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
            createMarker: () => null, // Don't add extra markers
            lineOptions: {
                styles: [{ color: '#4285f4', weight: 5, opacity: 0.7 }]
            }
        }).addTo(this.map);
    },

    /**
     * Removes the current route from the map.
     */
    clearRoute() {
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }
    },

    /**
     * Creates a small static map in the detail modal.
     */
    createDetailMap(containerId, lat, lng) {
        if (this.detailMap) {
            this.detailMap.remove();
        }

        this.detailMap = L.map(containerId, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.detailMap);

        const icon = L.divIcon({
            className: 'coffee-marker-wrapper',
            html: '<div class="coffee-marker">&#9749;</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        L.marker([lat, lng], { icon }).addTo(this.detailMap);

        setTimeout(() => this.detailMap.invalidateSize(), 100);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
