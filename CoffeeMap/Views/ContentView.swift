import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var appState = AppState()
    @State private var locationService = LocationService()
    @State private var mapViewModel = MapViewModel()
    @State private var geocodingViewModel = GeocodingViewModel()
    @State private var geofenceViewModel = GeofenceViewModel()

    var body: some View {
        Group {
            if !appState.hasCompletedOnboarding {
                OnboardingView(appState: appState)
            } else {
                mainTabView
            }
        }
        .onAppear {
            locationService.requestWhenInUseAuthorization()
        }
    }

    private var mainTabView: some View {
        TabView(selection: $appState.selectedTab) {
            Tab("Map", systemImage: "map", value: .map) {
                CoffeeMapView(
                    mapViewModel: mapViewModel,
                    locationService: locationService,
                    geocodingViewModel: geocodingViewModel
                )
            }

            Tab("List", systemImage: "list.bullet", value: .list) {
                CoffeeListView(
                    mapViewModel: mapViewModel,
                    locationService: locationService
                )
            }

            Tab("Import", systemImage: "square.and.arrow.down", value: .importData) {
                ImportView(geocodingViewModel: geocodingViewModel)
            }

            Tab("Settings", systemImage: "gearshape", value: .settings) {
                SettingsView(
                    appState: appState,
                    locationService: locationService,
                    geofenceViewModel: geofenceViewModel,
                    geocodingViewModel: geocodingViewModel
                )
            }
        }
    }
}
