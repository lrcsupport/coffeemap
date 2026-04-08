import Foundation
import CoreLocation

struct DistanceFormatter {
    private static let measurementFormatter: MeasurementFormatter = {
        let formatter = MeasurementFormatter()
        formatter.unitOptions = .naturalScale
        formatter.numberFormatter.maximumFractionDigits = 1
        return formatter
    }()

    /// Formats a distance in meters to a human-readable string.
    /// Uses the user's locale to determine miles vs kilometers.
    static func format(meters: CLLocationDistance) -> String {
        let measurement = Measurement(value: meters, unit: UnitLength.meters)
        return measurementFormatter.string(from: measurement)
    }

    /// Formats distance with a contextual description.
    static func formatWithContext(meters: CLLocationDistance) -> String {
        if meters < 100 {
            return "Right here"
        } else if meters < 500 {
            return "A short walk (\(format(meters: meters)))"
        } else {
            return format(meters: meters)
        }
    }
}
