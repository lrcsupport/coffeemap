import Foundation
import SwiftData
import CoreLocation
import os

@Observable
final class GeofenceViewModel {
    private let geofenceService = GeofenceService()
    private let notificationService = NotificationService()
    private let logger = Logger(subsystem: "com.coffeemap", category: "GeofenceVM")

    var isMonitoring = false
    var monitoredCount = 0

    /// Starts geofence monitoring after requesting notification permissions.
    func startMonitoring(
        accounts: [CoffeeAccount],
        userLocation: CLLocation?,
        radiusMeters: Double = Configuration.geofenceRadiusMeters
    ) async {
        // Request notification permission
        let granted = await notificationService.requestAuthorization()
        guard granted else {
            logger.warning("Notification permission denied, cannot send proximity alerts")
            return
        }

        await geofenceService.startMonitoring()

        await updateRegions(
            accounts: accounts,
            userLocation: userLocation,
            radiusMeters: radiusMeters
        )

        isMonitoring = true
    }

    /// Updates the monitored regions based on the user's current location.
    /// Called when the user moves significantly.
    func updateRegions(
        accounts: [CoffeeAccount],
        userLocation: CLLocation?,
        radiusMeters: Double = Configuration.geofenceRadiusMeters
    ) async {
        let locatedAccounts = accounts.filter {
            $0.isCoffeeShop && !$0.isHidden && $0.location != nil
        }

        // Sort by distance from user if location is available
        let sorted: [(identifier: String, name: String, coordinate: CLLocationCoordinate2D)]
        if let userLocation {
            sorted = locatedAccounts
                .sorted { a, b in
                    let distA = a.location!.clLocation.distance(from: userLocation)
                    let distB = b.location!.clLocation.distance(from: userLocation)
                    return distA < distB
                }
                .map { ($0.username, $0.displayName ?? $0.username, $0.location!.coordinate) }
        } else {
            sorted = locatedAccounts
                .map { ($0.username, $0.displayName ?? $0.username, $0.location!.coordinate) }
        }

        await geofenceService.updateMonitoredRegions(
            locations: sorted,
            radiusMeters: radiusMeters
        )

        monitoredCount = min(sorted.count, Configuration.maxMonitoredRegions)
    }

    /// Stops all geofence monitoring.
    func stopMonitoring() async {
        await geofenceService.stopMonitoring()
        isMonitoring = false
        monitoredCount = 0
    }
}
