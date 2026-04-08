import Foundation
import SwiftData
import MapKit
import CoreLocation

@Observable
final class MapViewModel {
    var cameraPosition: MapCameraPosition = .automatic
    var selectedAccount: CoffeeAccount?
    var showingDetail = false
    var searchText = ""
    var filterByResolved = true

    /// Returns accounts filtered for map display.
    func filteredAccounts(from accounts: [CoffeeAccount]) -> [CoffeeAccount] {
        var result = accounts.filter { $0.isCoffeeShop && !$0.isHidden && $0.location != nil }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.username.lowercased().contains(query) ||
                ($0.displayName?.lowercased().contains(query) ?? false) ||
                ($0.location?.city?.lowercased().contains(query) ?? false)
            }
        }

        return result
    }

    /// Centers the map on the user's current location.
    func centerOnUser(location: CLLocationCoordinate2D) {
        cameraPosition = .region(MKCoordinateRegion(
            center: location,
            latitudinalMeters: 5000,
            longitudinalMeters: 5000
        ))
    }

    /// Centers the map on a specific account's location.
    func centerOn(account: CoffeeAccount) {
        guard let loc = account.location else { return }
        cameraPosition = .region(MKCoordinateRegion(
            center: loc.coordinate,
            latitudinalMeters: 2000,
            longitudinalMeters: 2000
        ))
    }

    /// Selects an account and shows its detail view.
    func select(_ account: CoffeeAccount) {
        selectedAccount = account
        showingDetail = true
    }
}
