import SwiftUI

@Observable
final class AppState {
    var selectedTab: AppTab = .map
    var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") }
        set { UserDefaults.standard.set(newValue, forKey: "hasCompletedOnboarding") }
    }
    var isGeofencingEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "isGeofencingEnabled") }
        set { UserDefaults.standard.set(newValue, forKey: "isGeofencingEnabled") }
    }
    var geofenceRadiusMeters: Double {
        get {
            let stored = UserDefaults.standard.double(forKey: "geofenceRadiusMeters")
            return stored > 0 ? stored : Configuration.geofenceRadiusMeters
        }
        set { UserDefaults.standard.set(newValue, forKey: "geofenceRadiusMeters") }
    }
}

enum AppTab: String, CaseIterable {
    case map = "Map"
    case list = "List"
    case importData = "Import"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .map: return "map"
        case .list: return "list.bullet"
        case .importData: return "square.and.arrow.down"
        case .settings: return "gearshape"
        }
    }
}
