import Foundation
import CoreLocation
import os

@available(iOS 17.0, *)
actor GeofenceService {
    private let logger = Logger(subsystem: "com.coffeemap", category: "Geofence")
    private var monitor: CLMonitor?
    private let notificationService = NotificationService()
    private var monitoredIdentifiers: Set<String> = []
    private var monitoringTask: Task<Void, Never>?

    /// Initializes the CLMonitor and starts listening for events.
    func startMonitoring() async {
        do {
            monitor = await CLMonitor("CoffeeMapGeofenceMonitor")
            logger.info("CLMonitor initialized")
            startListeningForEvents()
        }
    }

    /// Updates monitored regions based on the nearest coffee locations.
    /// Only the closest `maxRegions` locations are monitored (iOS limit: 20).
    func updateMonitoredRegions(
        locations: [(identifier: String, name: String, coordinate: CLLocationCoordinate2D)],
        radiusMeters: Double = Configuration.geofenceRadiusMeters,
        maxRegions: Int = Configuration.maxMonitoredRegions
    ) async {
        guard let monitor else {
            logger.warning("Monitor not initialized, call startMonitoring() first")
            return
        }

        let locationsToMonitor = Array(locations.prefix(maxRegions))
        let newIdentifiers = Set(locationsToMonitor.map(\.identifier))

        // Remove regions no longer in the top N
        for oldId in monitoredIdentifiers.subtracting(newIdentifiers) {
            await monitor.remove(oldId)
            logger.info("Removed region: \(oldId)")
        }

        // Add new regions
        for location in locationsToMonitor {
            if !monitoredIdentifiers.contains(location.identifier) {
                let condition = CLMonitor.CircularGeographicCondition(
                    center: location.coordinate,
                    radius: radiusMeters
                )
                await monitor.add(condition, identifier: location.identifier)
                logger.info("Added region: \(location.identifier) at \(location.coordinate.latitude), \(location.coordinate.longitude)")
            }
        }

        monitoredIdentifiers = newIdentifiers
    }

    /// Removes all monitored regions.
    func stopMonitoring() async {
        guard let monitor else { return }

        for identifier in monitoredIdentifiers {
            await monitor.remove(identifier)
        }
        monitoredIdentifiers.removeAll()
        monitoringTask?.cancel()
        monitoringTask = nil
        logger.info("All geofences removed")
    }

    private func startListeningForEvents() {
        monitoringTask = Task {
            guard let monitor else { return }

            for try await event in await monitor.events {
                switch event.state {
                case .satisfied:
                    logger.info("Entered region: \(event.identifier)")
                    await notificationService.sendProximityAlert(
                        identifier: event.identifier
                    )
                case .unsatisfied:
                    logger.info("Exited region: \(event.identifier)")
                default:
                    break
                }
            }
        }
    }
}
