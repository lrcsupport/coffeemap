/**
 * Geocoding Module
 * Resolves Instagram usernames to physical locations using:
 * 1. Google Places Text Search API — best results (if API key configured)
 * 2. Nominatim (OpenStreetMap) — free fallback, no API key needed
 */
const Geocoding = {
    NOMINATIM_DELAY_MS: 1100, // Nominatim rate limit: 1 req/sec
    GOOGLE_DELAY_MS: 200,
    googleApiKey: null,

    /**
     * Set Google Places API key for enhanced geocoding.
     */
    setGoogleApiKey(key) {
        this.googleApiKey = key && key.trim() && key !== 'YOUR_GOOGLE_PLACES_API_KEY' ? key.trim() : null;
    },

    /**
     * Geocodes a username to a location using tiered fallback.
     * Tries Google Places first (better results), then Nominatim.
     */
    async geocode(username, userLocation = null) {
        const query = this.formatQuery(username);

        // Tier 1: Google Places (if configured) — much better for business names
        if (this.googleApiKey) {
            const googleResult = await this.searchGooglePlaces(query, userLocation);
            if (googleResult) return googleResult;

            // Try a broader search without type restriction
            const broadResult = await this.searchGooglePlacesBroad(query, userLocation);
            if (broadResult) return broadResult;
        }

        // Tier 2: Nominatim
        await this.delay(this.NOMINATIM_DELAY_MS);
        const nominatimResult = await this.searchNominatim(query, userLocation);
        if (nominatimResult) return nominatimResult;

        return null;
    },

    /**
     * Geocodes a single account. Used for quick-add flow.
     */
    async geocodeOne(account, userLocation) {
        const result = await this.geocode(account.username, userLocation);
        if (result) {
            account.location = result;
            account.geocodingStatus = 'resolved';
        } else {
            account.geocodingStatus = 'failed';
        }
        return account;
    },

    /**
     * Geocodes a batch of pending accounts with progress callbacks.
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

            await this.geocodeOne(account, userLocation);

            completed++;
            if (onProgress) {
                onProgress({
                    current: null,
                    completed,
                    total: pending.length,
                    progress: completed / pending.length
                });
            }

            // Rate limit between requests
            await this.delay(this.googleApiKey ? this.GOOGLE_DELAY_MS : this.NOMINATIM_DELAY_MS);
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
     * Searches Google Places Text Search API with cafe type hint.
     */
    async searchGooglePlaces(query, userLocation) {
        return this._googleSearch(query, userLocation, 'cafe');
    },

    /**
     * Searches Google Places without type restriction (broader match).
     */
    async searchGooglePlacesBroad(query, userLocation) {
        await this.delay(this.GOOGLE_DELAY_MS);
        return this._googleSearch(query, userLocation, null);
    },

    async _googleSearch(query, userLocation, includedType) {
        if (!this.googleApiKey) return null;

        try {
            const body = {
                textQuery: query,
                maxResultCount: 5
            };

            if (includedType) {
                body.includedType = includedType;
            }

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

            if (!response.ok) {
                console.warn('Google Places API error:', response.status);
                return null;
            }

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
     * Examples:
     *   "bluebottlecoffee" -> "blue bottle coffee"
     *   "stumptown_coffee" -> "stumptown coffee"
     *   "theroastery.nyc"  -> "the roastery nyc"
     */
    formatQuery(username) {
        let query = username
            .replace(/_/g, ' ')
            .replace(/\./g, ' ')
            .replace(/-/g, ' ');

        // Try to split camelCase / smashed-together words
        query = query.replace(/([a-z])([A-Z])/g, '$1 $2');

        // Insert spaces before common business suffixes if smashed together
        query = query.replace(/(coffee|roast|brew|cafe|bakery|kitchen|house|shop|bar|pub|grill|bistro)/gi,
            (match, p1, offset) => offset > 0 ? ' ' + p1 : p1
        );

        // Clean up multiple spaces
        query = query.replace(/\s+/g, ' ').trim();

        return query;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
