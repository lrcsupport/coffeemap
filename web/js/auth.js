/**
 * Auth Module
 * Handles Supabase authentication, user profiles, and data sync.
 * Supabase URL and anon key are set via Auth.init().
 */
const Auth = {
    supabase: null,
    user: null,
    profile: null,
    _onChangeCallbacks: [],

    // ========================
    // Initialization
    // ========================

    init(supabaseUrl, supabaseAnonKey) {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('[Auth] Supabase credentials not configured');
            return;
        }

        this.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            const prevUser = this.user;
            this.user = session?.user || null;

            if (this.user) {
                await this.loadProfile();
            } else {
                this.profile = null;
            }

            // Notify listeners
            this._onChangeCallbacks.forEach(cb => cb(event, this.user, this.profile));

            // Handle first sign-in migration
            if (this.user && !prevUser && event === 'SIGNED_IN') {
                await this.migrateLocalStorage();
            }
        });
    },

    // ========================
    // Auth Methods
    // ========================

    async signInWithGoogle() {
        if (!this.supabase) return;
        const { error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) console.error('[Auth] Google sign-in error:', error);
    },

    async signInWithApple() {
        if (!this.supabase) return;
        const { error } = await this.supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo: window.location.origin }
        });
        if (error) console.error('[Auth] Apple sign-in error:', error);
    },

    async signOut() {
        if (!this.supabase) return;
        await this.supabase.auth.signOut();
        this.user = null;
        this.profile = null;
    },

    onAuthChange(callback) {
        this._onChangeCallbacks.push(callback);
    },

    isSignedIn() {
        return !!this.user;
    },

    // ========================
    // Profile & Tier
    // ========================

    async loadProfile() {
        if (!this.supabase || !this.user) return null;

        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (error) {
            console.warn('[Auth] Failed to load profile:', error);
            return null;
        }

        this.profile = data;
        return data;
    },

    getTier() {
        return this.profile?.tier || 'free';
    },

    getPlacesLimit() {
        if (this.getTier() === 'pro') return Infinity;
        return this.profile?.places_limit || 20;
    },

    isPro() {
        return this.getTier() === 'pro';
    },

    // ========================
    // Places CRUD
    // ========================

    async fetchPlaces() {
        if (!this.supabase || !this.user) return [];

        const { data, error } = await this.supabase
            .from('places')
            .select('*')
            .eq('user_id', this.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('[Auth] Failed to fetch places:', error);
            return [];
        }

        return data.map(this._dbToAccount);
    },

    async savePlace(account) {
        if (!this.supabase || !this.user) return { error: 'Not signed in' };

        const row = this._accountToDb(account);
        row.user_id = this.user.id;

        const { data, error } = await this.supabase
            .from('places')
            .upsert(row, { onConflict: 'user_id,username' })
            .select()
            .single();

        if (error) {
            // Check if it's a tier limit error
            if (error.code === '42501' || error.message?.includes('row-level security')) {
                return { error: 'limit_reached' };
            }
            console.warn('[Auth] Failed to save place:', error);
            return { error: error.message };
        }

        return { data: this._dbToAccount(data) };
    },

    async deletePlace(username) {
        if (!this.supabase || !this.user) return;

        await this.supabase
            .from('places')
            .delete()
            .eq('user_id', this.user.id)
            .eq('username', username);
    },

    async getPlaceCount() {
        if (!this.supabase || !this.user) return 0;

        const { count, error } = await this.supabase
            .from('places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', this.user.id);

        if (error) return 0;
        return count || 0;
    },

    async canAddPlace() {
        const count = await this.getPlaceCount();
        return count < this.getPlacesLimit();
    },

    // ========================
    // Geocoding (via Edge Function)
    // ========================

    async geocode(username, userLat, userLng) {
        if (!this.supabase) return null;

        const { data: { session } } = await this.supabase.auth.getSession();
        if (!session) return null;

        try {
            const resp = await fetch('/api/geocode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ username, userLat, userLng }),
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                console.warn('[Auth] Geocode error:', errData);
                return null;
            }

            const data = await resp.json();
            return data.location || null;
        } catch (e) {
            console.warn('[Auth] Geocode fetch failed:', e);
            return null;
        }
    },

    // ========================
    // localStorage Migration
    // ========================

    async migrateLocalStorage() {
        if (!this.user) return;

        const migrationKey = `migration_complete_${this.user.id}`;
        if (localStorage.getItem(migrationKey)) return;

        const raw = localStorage.getItem('coffee_accounts');
        if (!raw) {
            localStorage.setItem(migrationKey, 'true');
            return;
        }

        try {
            const accounts = JSON.parse(raw);
            if (!Array.isArray(accounts) || accounts.length === 0) {
                localStorage.setItem(migrationKey, 'true');
                return;
            }

            console.log(`[Auth] Migrating ${accounts.length} places from localStorage...`);

            for (const account of accounts) {
                await this.savePlace(account);
            }

            localStorage.setItem(migrationKey, 'true');
            console.log('[Auth] Migration complete');
        } catch (e) {
            console.warn('[Auth] Migration failed:', e);
        }
    },

    // ========================
    // Data Mapping
    // ========================

    _accountToDb(account) {
        return {
            username: account.username,
            profile_url: account.profileURL || `https://www.instagram.com/${account.username}/`,
            is_coffee_shop: account.isCoffeeShop !== false,
            is_hidden: account.isHidden || false,
            geocoding_status: account.geocodingStatus || 'pending',
            latitude: account.location?.latitude || null,
            longitude: account.location?.longitude || null,
            address: account.location?.address || null,
            city: account.location?.city || null,
            state: account.location?.state || null,
            country: account.location?.country || null,
            display_name: account.location?.displayName || null,
            rating: account.location?.rating || null,
            phone_number: account.location?.phoneNumber || null,
            website_url: account.location?.websiteURL || null,
            google_place_id: account.location?.googlePlaceID || null,
            source: account.location?.source || null,
            follow_timestamp: account.followTimestamp || new Date().toISOString(),
        };
    },

    _dbToAccount(row) {
        const hasLocation = row.latitude != null && row.longitude != null;
        return {
            username: row.username,
            profileURL: row.profile_url,
            followTimestamp: new Date(row.follow_timestamp || row.created_at),
            isCoffeeShop: row.is_coffee_shop,
            isHidden: row.is_hidden,
            geocodingStatus: row.geocoding_status,
            location: hasLocation ? {
                latitude: row.latitude,
                longitude: row.longitude,
                address: row.address,
                city: row.city,
                state: row.state,
                country: row.country,
                displayName: row.display_name,
                rating: row.rating,
                phoneNumber: row.phone_number,
                websiteURL: row.website_url,
                googlePlaceID: row.google_place_id,
                source: row.source,
            } : null,
        };
    },

    // ========================
    // Auth Token Helper
    // ========================

    async getAccessToken() {
        if (!this.supabase) return null;
        const { data: { session } } = await this.supabase.auth.getSession();
        return session?.access_token || null;
    }
};
