import Foundation
import MapKit
import CoreLocation
import os

actor GeocodingService {
    private let logger = Logger(subsystem: "com.coffeemap", category: "Geocoding")
    private let geocoder = CLGeocoder()
    private let googlePlacesService = GooglePlacesService()

    struct GeocodingResult {
        let latitude: Double
        let longitude: Double
        let address: String?
        let city: String?
        let state: String?
        let country: String?
        let googlePlaceID: String?
        let phoneNumber: String?
        let websiteURL: URL?
        let rating: Double?
        let source: GeocodingSource
    }

    /// Attempts to geocode a coffee shop username using a three-tier fallback:
    /// 1. MKLocalSearch (Apple Maps POI database)
    /// 2. CLGeocoder (address-based geocoding)
    /// 3. Google Places Text Search API
    func geocode(
        username: String,
        near userLocation: CLLocationCoordinate2D? = nil
    ) async -> GeocodingResult? {
        let searchQuery = formatSearchQuery(username)

        // Tier 1: MKLocalSearch
        if let result = await searchAppleMaps(query: searchQuery, near: userLocation) {
            logger.info("Resolved '\(username)' via Apple Maps")
            return result
        }

        // Brief delay to respect rate limits
        try? await Task.sleep(for: .seconds(Configuration.geocodingDelaySeconds))

        // Tier 2: Google Places Text Search
        if let result = await searchGooglePlaces(query: searchQuery, near: userLocation) {
            logger.info("Resolved '\(username)' via Google Places")
            return result
        }

        logger.warning("Failed to geocode '\(username)' with all tiers")
        return nil
    }

    // MARK: - Tier 1: Apple Maps

    private func searchAppleMaps(
        query: String,
        near location: CLLocationCoordinate2D?
    ) async -> GeocodingResult? {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query

        if let location {
            request.region = MKCoordinateRegion(
                center: location,
                latitudinalMeters: 50_000,
                longitudinalMeters: 50_000
            )
        }

        request.resultTypes = .pointOfInterest

        do {
            let search = MKLocalSearch(request: request)
            let response = try await search.start()

            // Find the best match — prefer cafes/restaurants
            let bestMatch = response.mapItems.first { item in
                let categories = item.pointOfInterestCategory
                return categories == .cafe || categories == .restaurant || categories == .foodMarket
            } ?? response.mapItems.first

            guard let item = bestMatch else { return nil }

            return GeocodingResult(
                latitude: item.placemark.coordinate.latitude,
                longitude: item.placemark.coordinate.longitude,
                address: formatAddress(from: item.placemark),
                city: item.placemark.locality,
                state: item.placemark.administrativeArea,
                country: item.placemark.country,
                googlePlaceID: nil,
                phoneNumber: item.phoneNumber,
                websiteURL: item.url,
                rating: nil,
                source: .appleMapKit
            )
        } catch {
            logger.error("Apple Maps search failed for '\(query)': \(error)")
            return nil
        }
    }

    // MARK: - Tier 2: Google Places

    private func searchGooglePlaces(
        query: String,
        near location: CLLocationCoordinate2D?
    ) async -> GeocodingResult? {
        guard Configuration.googlePlacesAPIKey != "YOUR_GOOGLE_PLACES_API_KEY" else {
            logger.warning("Google Places API key not configured, skipping")
            return nil
        }

        do {
            let result = try await googlePlacesService.textSearch(
                query: query,
                near: location
            )
            return result
        } catch {
            logger.error("Google Places search failed for '\(query)': \(error)")
            return nil
        }
    }

    // MARK: - Helpers

    private func formatSearchQuery(_ username: String) -> String {
        // Convert Instagram username to a more searchable form
        // e.g., "bluebottlecoffee" -> "blue bottle coffee"
        // e.g., "stumptown_coffee" -> "stumptown coffee"
        var query = username
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: ".", with: " ")
            .replacingOccurrences(of: "-", with: " ")

        // Add "coffee" if not already present to help search
        let lowered = query.lowercased()
        let hasCoffeeKeyword = Configuration.coffeeKeywords.contains { lowered.contains($0) }
        if !hasCoffeeKeyword {
            query += " coffee"
        }

        return query
    }

    private func formatAddress(from placemark: MKPlacemark) -> String? {
        let components = [
            placemark.subThoroughfare,
            placemark.thoroughfare,
            placemark.locality,
            placemark.administrativeArea,
            placemark.postalCode
        ]
        let address = components.compactMap { $0 }.joined(separator: " ")
        return address.isEmpty ? nil : address
    }
}
