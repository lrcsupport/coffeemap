/**
 * Geocoding Module
 * Resolves Instagram usernames to physical locations using:
 * 1. Nominatim (OpenStreetMap) — free, no API key needed
 * 2. Google Places Text Search API — optional, better results
 */
const Geocoding = {
    NOMINATIM_DELAY_MS: 1100, // Nominatim rate limit: 1 req/sec
    GOOGLE_DELAY_MS: 200,
    googleApiKey: null,

    /**
     * Set Google Places API key for enhanced geocoding.
     */
    setGoogleApiKey(key) {
        this.googleApiKey = key && key !== 'YOUR_GOOGLE_PLACES_API_KEY' ? key : null;
    },

    /**
     * Geocodes a username to a location using tiered fallback.
     * @param {string} username - Instagram username
     * @param {object|null} userLocation - { lat, lng } for proximity bias
     * @returns {Promise<object|null>} Location result or null
     */
    async geocode(username, userLocation = null) {
        const query = this.formatQuery(username);

        // Tier 1: Nominatim
        const nominatimResult = await this.searchNominatim(query, userLocation);
        if (nominatimResult) return nominatimResult;

        // Tier 2: Google Places (if configured)
        if (this.googleApiKey) {
            await this.delay(this.GOOGLE_DELAY_MS);
            const googleResult = await this.searchGooglePlaces(query, userLocation);
            if (googleResult) return googleResult;
        }

        return null;
    },

    /**
     * Geocodes a batch of accounts with progress callbacks.
     */
    async geocodeBatch(accounts, userLocation, onProgress) {
        const pending = accounts.filter(a => a.isCoffeeShop && !a.isHidden && a.geocodingStatus === 'pending');
        let completed = 0;

        for (const account of pending) {
            if (onProgress) {
                onProgress({
                    current: account.username,
                    completed,
                    total: pending.length,
                    progress: pending.length > 0 ? completed / pending.length : 0
                });
            }

            const result = await this.geocode(account.username, userLocation);

            if (result) {
                account.location = result;
                account.geocodingStatus = 'resolved';
            } else {
                account.geocodingStatus = 'failed';
            }

            completed++;
            if (onProgress) {
                onProgress({
                    current: null,
                    completed,
                    total: pending.length,
                    progress: completed / pending.length
                });
            }

            // Rate limit
            await this.delay(this.NOMINATIM_DELAY_MS);
        }

        return accounts;
    },

    /**
     * Searches Nominatim (OpenStreetMap) for a location.
     */
    async searchNominatim(query, userLocation) {
        try {
            let url = `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

            if (userLocation) {
                url += `&viewbox=${userLocation.lng - 0.5},${userLocation.lat + 0.5},${userLocation.lng + 0.5},${userLocation.lat - 0.5}`;
                url += `&bounded=0`;
            }

            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) return null;

            const results = await response.json();

            // Prefer results with cafe/restaurant/shop type
            const coffeeResult = results.find(r =>
                r.type === 'cafe' || r.type === 'restaurant' ||
                r.class === 'amenity' || r.class === 'shop'
            ) || results[0];

            if (!coffeeResult) return null;

            const addr = coffeeResult.address || {};

            return {
                latitude: parseFloat(coffeeResult.lat),
                longitude: parseFloat(coffeeResult.lon),
                address: coffeeResult.display_name,
                city: addr.city || addr.town || addr.village || null,
                state: addr.state || null,
                country: addr.country || null,
                source: 'nominatim',
                rating: null,
                phoneNumber: null,
                websiteURL: null,
                googlePlaceID: null
            };
        } catch (e) {
            console.warn('Nominatim search failed:', e);
            return null;
        }
    },

    /**
     * Searches Google Places Text Search API.
     */
    async searchGooglePlaces(query, userLocation) {
        if (!this.googleApiKey) return null;

        try {
            const body = {
                textQuery: query,
                includedType: 'cafe',
                maxResultCount: 5
            };

            if (userLocation) {
                body.locationBias = {
                    circle: {
                        center: { latitude: userLocation.lat, longitude: userLocation.lng },
                        radius: 50000
                    }
                };
            }

            const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.googleApiKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.nationalPhoneNumber,places.websiteUri,places.rating'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) return null;

            const data = await response.json();
            const place = data.places?.[0];
            if (!place) return null;

            return {
                latitude: place.location.latitude,
                longitude: place.location.longitude,
                address: place.formattedAddress || null,
                city: null,
                state: null,
                country: null,
                source: 'google',
                rating: place.rating || null,
                phoneNumber: place.nationalPhoneNumber || null,
                websiteURL: place.websiteUri || null,
                googlePlaceID: place.id || null,
                displayName: place.displayName?.text || null
            };
        } catch (e) {
            console.warn('Google Places search failed:', e);
            return null;
        }
    },

    /**
     * Converts an Instagram username into a more searchable query.
     */
    formatQuery(username) {
        let query = username
            .replace(/_/g, ' ')
            .replace(/\./g, ' ')
            .replace(/-/g, ' ');

        const lowered = query.toLowerCase();
        const hasCoffeeWord = InstagramImport.COFFEE_KEYWORDS.some(kw => lowered.includes(kw));
        if (!hasCoffeeWord) {
            query += ' coffee';
        }

        return query;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
