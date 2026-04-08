/**
 * Instagram Import Module
 * Parses Instagram data export JSON files to extract following accounts.
 */
const InstagramImport = {
    COFFEE_KEYWORDS: [
        'coffee', 'cafe', 'café', 'roast', 'roaster', 'roastery',
        'brew', 'brewery', 'espresso', 'latte', 'barista',
        'bean', 'beans', 'drip', 'pourover', 'pour-over',
        'cappuccino', 'mocha', 'coffeehouse', 'coffeeshop',
        'thirdwave', 'third-wave', 'specialtycoffee', 'specialty-coffee'
    ],

    /**
     * Parses an Instagram export JSON file.
     * Handles both wrapped format (with "relationships_following" key)
     * and flat array format.
     * @param {File} file - The JSON file from Instagram data export
     * @returns {Promise<Array>} Array of { username, profileURL, followTimestamp }
     */
    async parseFile(file) {
        const text = await file.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file. Please select the following.json from your Instagram data export.');
        }

        let entries = [];

        // Format 1: Wrapped with "relationships_following"
        if (data.relationships_following && Array.isArray(data.relationships_following)) {
            entries = data.relationships_following;
        }
        // Format 2: Flat array
        else if (Array.isArray(data)) {
            entries = data;
        } else {
            throw new Error('Unrecognized file format. Expected Instagram following export JSON.');
        }

        const accounts = [];

        for (const entry of entries) {
            if (!entry.string_list_data || entry.string_list_data.length === 0) continue;

            const stringData = entry.string_list_data[0];
            const username = (stringData.value || '').toLowerCase().trim();
            if (!username) continue;

            accounts.push({
                username,
                profileURL: stringData.href || `https://www.instagram.com/${username}`,
                followTimestamp: new Date((stringData.timestamp || 0) * 1000),
                isCoffeeShop: this.isCoffeeRelated(username),
                geocodingStatus: 'pending',
                location: null,
                isHidden: false
            });
        }

        return accounts;
    },

    /**
     * Checks if a username is likely coffee-related.
     */
    isCoffeeRelated(username) {
        const lowered = username.toLowerCase();
        return this.COFFEE_KEYWORDS.some(keyword => lowered.includes(keyword));
    },

    /**
     * Returns a confidence score (0-1) for how coffee-related a username is.
     */
    confidence(username) {
        const lowered = username.toLowerCase();
        const matches = this.COFFEE_KEYWORDS.filter(kw => lowered.includes(kw)).length;
        return Math.min(1, matches * 0.4);
    }
};
