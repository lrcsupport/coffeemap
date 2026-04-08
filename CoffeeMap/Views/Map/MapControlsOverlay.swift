import SwiftUI

struct MapControlsOverlay: View {
    @Bindable var mapViewModel: MapViewModel
    var locationService: LocationService
    var geocodingViewModel: GeocodingViewModel
    let pendingCount: Int

    @Environment(\.modelContext) private var modelContext

    var body: some View {
        VStack {
            Spacer()

            HStack {
                Spacer()

                VStack(spacing: 12) {
                    // Geocode pending accounts button
                    if pendingCount > 0 {
                        Button {
                            Task {
                                await geocodingViewModel.geocodePendingAccounts(
                                    modelContext: modelContext,
                                    userLocation: locationService.currentCoordinate
                                )
                            }
                        } label: {
                            Label("\(pendingCount)", systemImage: "location.magnifyingglass")
                                .font(.caption)
                                .padding(8)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                        }
                        .disabled(geocodingViewModel.isGeocoding)
                    }

                    // Geocoding progress indicator
                    if geocodingViewModel.isGeocoding {
                        VStack(spacing: 4) {
                            ProgressView(value: geocodingViewModel.progress)
                                .frame(width: 40)
                            Text(geocodingViewModel.currentUsername ?? "")
                                .font(.caption2)
                                .lineLimit(1)
                        }
                        .padding(8)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                    }

                    // Center on user location
                    Button {
                        if let coord = locationService.currentCoordinate {
                            mapViewModel.centerOnUser(location: coord)
                        }
                    } label: {
                        Image(systemName: "location.fill")
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .disabled(!locationService.isAuthorized)
                }
                .padding()
            }
        }
    }
}
