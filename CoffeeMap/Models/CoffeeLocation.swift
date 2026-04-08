import Foundation
import SwiftData
import CoreLocation

enum GeocodingSource: String, Codable {
    case appleMapKit
    case googlePlaces
    case manual
}

@Model
final class CoffeeLocation {
    var latitude: Double
    var longitude: Double
    var address: String?
    var city: String?
    var state: String?
    var country: String?
    var googlePlaceID: String?
    var phoneNumber: String?
    var websiteURL: URL?
    var rating: Double?
    var source: GeocodingSource
    var account: CoffeeAccount?

    init(
        latitude: Double,
        longitude: Double,
        address: String? = nil,
        city: String? = nil,
        state: String? = nil,
        country: String? = nil,
        source: GeocodingSource = .appleMapKit
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.address = address
        self.city = city
        self.state = state
        self.country = country
        self.source = source
    }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var clLocation: CLLocation {
        CLLocation(latitude: latitude, longitude: longitude)
    }

    var formattedAddress: String {
        [address, city, state, country]
            .compactMap { $0 }
            .joined(separator: ", ")
    }
}
