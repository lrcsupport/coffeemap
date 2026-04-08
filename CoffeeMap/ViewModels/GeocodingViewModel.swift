import Foundation
import SwiftData
import CoreLocation
import os

@Observable
final class GeocodingViewModel {
    private let geocodingService = GeocodingService()
    private let logger = Logger(subsystem: "com.coffeemap", category: "GeocodingVM")

    var isGeocoding = false
    var progress: Double = 0
    var totalToGeocode: Int = 0
    var completedCount: Int = 0
    var failedCount: Int = 0
    var currentUsername: String?

    /// Geocodes all coffee accounts that haven't been resolved yet.
    func geocodePendingAccounts(
        modelContext: ModelContext,
        userLocation: CLLocationCoordinate2D? = nil
    ) async {
        let predicate = #Predicate<CoffeeAccount> {
            $0.isCoffeeShop && !$0.isHidden && $0.geocodingStatus == .pending
        }
        let descriptor = FetchDescriptor<CoffeeAccount>(predicate: predicate)

        guard let accounts = try? modelContext.fetch(descriptor), !accounts.isEmpty else {
            logger.info("No pending accounts to geocode")
            return
        }

        isGeocoding = true
        totalToGeocode = accounts.count
        completedCount = 0
        failedCount = 0
        progress = 0

        for account in accounts {
            guard !Task.isCancelled else { break }

            currentUsername = account.username
            logger.info("Geocoding: \(account.username)")

            let result = await geocodingService.geocode(
                username: account.username,
                near: userLocation
            )

            if let result {
                let location = CoffeeLocation(
                    latitude: result.latitude,
                    longitude: result.longitude,
                    address: result.address,
                    city: result.city,
                    state: result.state,
                    country: result.country,
                    source: result.source
                )
                location.googlePlaceID = result.googlePlaceID
                location.phoneNumber = result.phoneNumber
                location.websiteURL = result.websiteURL
                location.rating = result.rating

                // Use display name from Google Places if available
                if account.displayName == nil, let googlePlaceID = result.googlePlaceID {
                    // The display name will come from search results
                }

                account.location = location
                account.geocodingStatus = .resolved
                account.lastGeocodedAt = .now
            } else {
                account.geocodingStatus = .failed
                account.lastGeocodedAt = .now
                failedCount += 1
            }

            completedCount += 1
            progress = Double(completedCount) / Double(totalToGeocode)

            try? modelContext.save()

            // Throttle requests
            try? await Task.sleep(for: .seconds(Configuration.geocodingDelaySeconds))
        }

        currentUsername = nil
        isGeocoding = false
        logger.info("Geocoding complete: \(self.completedCount)/\(self.totalToGeocode) resolved, \(self.failedCount) failed")
    }

    /// Retries geocoding for a single failed account.
    func retryGeocoding(
        for account: CoffeeAccount,
        modelContext: ModelContext,
        userLocation: CLLocationCoordinate2D? = nil
    ) async {
        account.geocodingStatus = .pending
        currentUsername = account.username

        let result = await geocodingService.geocode(
            username: account.username,
            near: userLocation
        )

        if let result {
            let location = CoffeeLocation(
                latitude: result.latitude,
                longitude: result.longitude,
                address: result.address,
                city: result.city,
                state: result.state,
                country: result.country,
                source: result.source
            )
            location.googlePlaceID = result.googlePlaceID
            location.phoneNumber = result.phoneNumber
            location.websiteURL = result.websiteURL
            location.rating = result.rating

            account.location = location
            account.geocodingStatus = .resolved
        } else {
            account.geocodingStatus = .failed
        }

        account.lastGeocodedAt = .now
        currentUsername = nil
        try? modelContext.save()
    }
}
