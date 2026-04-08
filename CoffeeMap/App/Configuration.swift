import Foundation

enum Configuration {
    // MARK: - Google Places API
    // Get your API key from https://console.cloud.google.com
    // Enable "Places API (New)" in your Google Cloud project
    static let googlePlacesAPIKey: String = {
        if let path = Bundle.main.path(forResource: "Secrets", ofType: "plist"),
           let dict = NSDictionary(contentsOfFile: path),
           let key = dict["GooglePlacesAPIKey"] as? String {
            return key
        }
        // Fallback: set your key here for development
        return "YOUR_GOOGLE_PLACES_API_KEY"
    }()

    // MARK: - Geocoding
    static let geocodingDelaySeconds: Double = 1.5
    static let maxConcurrentGeocoding: Int = 2

    // MARK: - Geofencing
    static let geofenceRadiusMeters: Double = 200
    static let maxMonitoredRegions: Int = 20
    static let significantDistanceChangeMeters: Double = 500

    // MARK: - Coffee Keywords
    static let coffeeKeywords: [String] = [
        "coffee", "cafe", "café", "roast", "roaster", "roastery",
        "brew", "brewery", "espresso", "latte", "barista",
        "bean", "beans", "drip", "pourover", "pour-over",
        "cappuccino", "mocha", "coffeehouse", "coffeeshop",
        "thirdwave", "third-wave", "specialtycoffee", "specialty-coffee"
    ]
}
