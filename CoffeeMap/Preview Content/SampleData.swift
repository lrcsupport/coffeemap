import Foundation
import CoreLocation

enum SampleData {
    static var sampleAccounts: [CoffeeAccount] {
        let accounts: [(String, Double, Double, String, String)] = [
            ("bluebottlecoffee", 37.7825, -122.4082, "66 Mint St, San Francisco, CA", "San Francisco"),
            ("stumptowncoffee", 45.5231, -122.6765, "128 SW 3rd Ave, Portland, OR", "Portland"),
            ("intelligentsiacoffee", 41.8842, -87.6475, "53 W Jackson Blvd, Chicago, IL", "Chicago"),
            ("counterculture", 35.9940, -78.8986, "2237 Danforth Dr, Durham, NC", "Durham"),
            ("vervecoffee", 36.9741, -122.0308, "816 41st Ave, Santa Cruz, CA", "Santa Cruz"),
        ]

        return accounts.map { (username, lat, lon, address, city) in
            let account = CoffeeAccount(
                username: username,
                followTimestamp: Date(timeIntervalSinceNow: -86400 * 30),
                isCoffeeShop: true
            )
            account.geocodingStatus = .resolved

            let location = CoffeeLocation(
                latitude: lat,
                longitude: lon,
                address: address,
                city: city,
                state: nil,
                country: "United States",
                source: .appleMapKit
            )
            location.rating = Double.random(in: 4.0...5.0)
            account.location = location

            return account
        }
    }
}
