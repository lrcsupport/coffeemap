/**
 * Location & Proximity Module
 * Handles browser geolocation, distance calculations, and proximity alerts.
 */
const LocationService = {
    currentPosition: null,
    watchId: null,
    proximityAlerts: false,
    alertRadius: 200, // meters
    alertedAccounts: new Set(), // track which accounts we've already alerted for
    onLocationUpdate: null,

    /**
     * Requests geolocation permission and starts watching position.
     */
    start(onUpdate) {
        this.onLocationUpdate = onUpdate;

        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return false;
        }

        navigator.geolocation.getCurrentPosition(
            pos => this.handlePosition(pos),
            err => console.warn('Geolocation error:', err),
            { enableHighAccuracy: true }
        );

        this.watchId = navigator.geolocation.watchPosition(
            pos => this.handlePosition(pos),
            err => console.warn('Geolocation watch error:', err),
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        );

        return true;
    },

    stop() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    handlePosition(position) {
        this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        if (this.onLocationUpdate) {
            this.onLocationUpdate(this.currentPosition);
        }

        // Check proximity if enabled
        if (this.proximityAlerts) {
            this.checkProximity();
        }
    },

    /**
     * Calculates distance in meters between two lat/lng points (Haversine formula).
     */
    distanceMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    toRad(deg) {
        return deg * (Math.PI / 180);
    },

    /**
     * Formats a distance in meters to human-readable string.
     */
    formatDistance(meters) {
        if (meters < 100) return 'Right here';
        if (meters < 1000) return `${Math.round(meters)}m`;
        const km = meters / 1000;
        if (km < 100) return `${km.toFixed(1)}km`;
        return `${Math.round(km)}km`;
    },

    /**
     * Returns distance from current position to a coordinate.
     */
    distanceTo(lat, lng) {
        if (!this.currentPosition) return null;
        return this.distanceMeters(
            this.currentPosition.lat, this.currentPosition.lng,
            lat, lng
        );
    },

    /**
     * Checks if user is near any coffee accounts and sends browser notifications.
     */
    checkProximity() {
        if (!this.currentPosition || !window.app) return;

        const accounts = window.app.getLocatedAccounts();

        for (const account of accounts) {
            if (!account.location || this.alertedAccounts.has(account.username)) continue;

            const dist = this.distanceTo(account.location.latitude, account.location.longitude);
            if (dist !== null && dist <= this.alertRadius) {
                this.sendProximityNotification(account);
                this.alertedAccounts.add(account.username);
            }
        }
    },

    /**
     * Sends a browser notification for proximity alert.
     */
    async sendProximityNotification(account) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;

        const name = account.location?.displayName || this.formatName(account.username);
        new Notification('Coffee Nearby! ☕', {
            body: `You're near ${name}. Tap to see details.`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">☕</text></svg>',
            tag: `proximity-${account.username}`
        });
    },

    /**
     * Enables or disables proximity alerts.
     */
    async enableProximityAlerts(enabled) {
        this.proximityAlerts = enabled;

        if (enabled) {
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            this.alertedAccounts.clear();
        }
    },

    setAlertRadius(meters) {
        this.alertRadius = meters;
    },

    /**
     * Resets alerted accounts so they can trigger again.
     */
    resetAlerts() {
        this.alertedAccounts.clear();
    },

    formatName(username) {
        return username.replace(/[_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
};
