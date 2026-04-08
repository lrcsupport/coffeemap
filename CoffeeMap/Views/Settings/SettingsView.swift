import SwiftUI
import SwiftData

struct SettingsView: View {
    @Bindable var appState: AppState
    var locationService: LocationService
    var geofenceViewModel: GeofenceViewModel
    var geocodingViewModel: GeocodingViewModel

    @Query(filter: #Predicate<CoffeeAccount> { $0.isCoffeeShop && !$0.isHidden })
    private var coffeeAccounts: [CoffeeAccount]

    @Environment(\.modelContext) private var modelContext
    @State private var showingClearConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                geofencingSection
                locationSection
                dataSection
                aboutSection
            }
            .navigationTitle("Settings")
        }
    }

    // MARK: - Geofencing

    private var geofencingSection: some View {
        Section {
            Toggle("Proximity Alerts", isOn: $appState.isGeofencingEnabled)
                .onChange(of: appState.isGeofencingEnabled) { _, enabled in
                    Task {
                        if enabled {
                            locationService.requestAlwaysAuthorization()
                            await geofenceViewModel.startMonitoring(
                                accounts: coffeeAccounts,
                                userLocation: locationService.currentLocation,
                                radiusMeters: appState.geofenceRadiusMeters
                            )
                        } else {
                            await geofenceViewModel.stopMonitoring()
                        }
                    }
                }

            if appState.isGeofencingEnabled {
                VStack(alignment: .leading) {
                    Text("Alert Radius: \(Int(appState.geofenceRadiusMeters))m")
                    Slider(value: $appState.geofenceRadiusMeters, in: 100...1000, step: 50)
                }

                HStack {
                    Text("Monitored regions")
                    Spacer()
                    Text("\(geofenceViewModel.monitoredCount)/\(Configuration.maxMonitoredRegions)")
                        .foregroundStyle(.secondary)
                }
            }
        } header: {
            Text("Proximity Alerts")
        } footer: {
            Text("Get notified when you're near a coffee shop you follow on Instagram. Requires \"Always\" location permission.")
        }
    }

    // MARK: - Location

    private var locationSection: some View {
        Section("Location") {
            HStack {
                Text("Permission")
                Spacer()
                Text(locationPermissionText)
                    .foregroundStyle(.secondary)
            }

            if !locationService.isAuthorized {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
        }
    }

    // MARK: - Data

    private var dataSection: some View {
        Section("Data") {
            HStack {
                Text("Coffee shops")
                Spacer()
                Text("\(coffeeAccounts.count)")
                    .foregroundStyle(.secondary)
            }

            let located = coffeeAccounts.filter { $0.location != nil }.count
            HStack {
                Text("Located")
                Spacer()
                Text("\(located)")
                    .foregroundStyle(.secondary)
            }

            let pending = coffeeAccounts.filter { $0.geocodingStatus == .pending }.count
            if pending > 0 {
                Button("Geocode \(pending) Pending") {
                    Task {
                        await geocodingViewModel.geocodePendingAccounts(
                            modelContext: modelContext,
                            userLocation: locationService.currentCoordinate
                        )
                    }
                }
            }

            let failed = coffeeAccounts.filter { $0.geocodingStatus == .failed }.count
            if failed > 0 {
                Button("Retry \(failed) Failed") {
                    retryFailed()
                }
            }

            Button("Clear All Data", role: .destructive) {
                showingClearConfirmation = true
            }
            .confirmationDialog(
                "Are you sure?",
                isPresented: $showingClearConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete All Data", role: .destructive) {
                    clearAllData()
                }
            } message: {
                Text("This will remove all imported accounts and locations. You can re-import your Instagram data afterward.")
            }
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        Section("About") {
            HStack {
                Text("CoffeeMap")
                Spacer()
                Text("1.0")
                    .foregroundStyle(.secondary)
            }

            Text("Find coffee shops and roasteries you follow on Instagram, mapped to their real-world locations.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Helpers

    private var locationPermissionText: String {
        switch locationService.authorizationStatus {
        case .notDetermined: return "Not Set"
        case .restricted: return "Restricted"
        case .denied: return "Denied"
        case .authorizedWhenInUse: return "While Using"
        case .authorizedAlways: return "Always"
        @unknown default: return "Unknown"
        }
    }

    private func retryFailed() {
        let failed = coffeeAccounts.filter { $0.geocodingStatus == .failed }
        for account in failed {
            account.geocodingStatus = .pending
        }
        try? modelContext.save()

        Task {
            await geocodingViewModel.geocodePendingAccounts(
                modelContext: modelContext,
                userLocation: locationService.currentCoordinate
            )
        }
    }

    private func clearAllData() {
        do {
            try modelContext.delete(model: CoffeeAccount.self)
            try modelContext.delete(model: CoffeeLocation.self)
            try modelContext.save()
        } catch {
            // Handle silently — data will be cleaned on next launch
        }
    }
}
