import Foundation
import CoreLocation
import os

actor GooglePlacesService {
    private let logger = Logger(subsystem: "com.coffeemap", category: "GooglePlaces")
    private let session = URLSession.shared

    /// Performs a Google Places Text Search (New) API call.
    /// Documentation: https://developers.google.com/maps/documentation/places/web-service/text-search
    func textSearch(
        query: String,
        near location: CLLocationCoordinate2D? = nil
    ) async throws -> GeocodingService.GeocodingResult? {
        let endpoint = "https://places.googleapis.com/v1/places:searchText"

        var body: [String: Any] = [
            "textQuery": query,
            "includedType": "cafe",
            "maxResultCount": 5
        ]

        if let location {
            body["locationBias"] = [
                "circle": [
                    "center": [
                        "latitude": location.latitude,
                        "longitude": location.longitude
                    ],
                    "radius": 50000.0
                ]
            ]
        }

        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Configuration.googlePlacesAPIKey, forHTTPHeaderField: "X-Goog-Api-Key")
        request.setValue(
            "places.displayName,places.formattedAddress,places.location,places.id,places.nationalPhoneNumber,places.websiteUri,places.rating",
            forHTTPHeaderField: "X-Goog-FieldMask"
        )
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PlacesError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            logger.error("Google Places API error \(httpResponse.statusCode): \(errorBody)")
            throw PlacesError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        let result = try JSONDecoder().decode(PlacesSearchResponse.self, from: data)

        guard let place = result.places?.first else {
            return nil
        }

        return GeocodingService.GeocodingResult(
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            address: place.formattedAddress,
            city: nil,
            state: nil,
            country: nil,
            googlePlaceID: place.id,
            phoneNumber: place.nationalPhoneNumber,
            websiteURL: place.websiteUri.flatMap { URL(string: $0) },
            rating: place.rating,
            source: .googlePlaces
        )
    }

    enum PlacesError: LocalizedError {
        case invalidResponse
        case apiError(statusCode: Int, message: String)

        var errorDescription: String? {
            switch self {
            case .invalidResponse:
                return "Invalid response from Google Places API"
            case .apiError(let code, let message):
                return "Google Places API error (\(code)): \(message)"
            }
        }
    }
}

// MARK: - Response Models

struct PlacesSearchResponse: Codable {
    let places: [PlaceResult]?
}

struct PlaceResult: Codable {
    let id: String
    let displayName: PlaceDisplayName?
    let formattedAddress: String?
    let location: PlaceLocation
    let nationalPhoneNumber: String?
    let websiteUri: String?
    let rating: Double?
}

struct PlaceDisplayName: Codable {
    let text: String
    let languageCode: String?
}

struct PlaceLocation: Codable {
    let latitude: Double
    let longitude: Double
}
