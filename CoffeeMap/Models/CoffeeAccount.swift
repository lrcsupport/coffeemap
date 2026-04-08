import Foundation
import SwiftData

enum GeocodingStatus: String, Codable {
    case pending
    case resolved
    case failed
    case manual
}

@Model
final class CoffeeAccount {
    @Attribute(.unique) var username: String
    var profileURL: URL
    var followTimestamp: Date
    var displayName: String?
    var isCoffeeShop: Bool
    var isHidden: Bool
    var profileImageData: Data?
    var importedAt: Date
    var lastGeocodedAt: Date?
    var geocodingStatus: GeocodingStatus

    @Relationship(deleteRule: .cascade, inverse: \CoffeeLocation.account)
    var location: CoffeeLocation?

    init(
        username: String,
        profileURL: URL? = nil,
        followTimestamp: Date = .now,
        displayName: String? = nil,
        isCoffeeShop: Bool = false,
        isHidden: Bool = false
    ) {
        self.username = username
        self.profileURL = profileURL ?? URL(string: "https://www.instagram.com/\(username)")!
        self.followTimestamp = followTimestamp
        self.displayName = displayName
        self.isCoffeeShop = isCoffeeShop
        self.isHidden = isHidden
        self.importedAt = .now
        self.geocodingStatus = .pending
    }

    var coordinate: (latitude: Double, longitude: Double)? {
        guard let loc = location else { return nil }
        return (loc.latitude, loc.longitude)
    }
}
