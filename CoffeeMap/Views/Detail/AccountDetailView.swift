import SwiftUI
import MapKit

struct AccountDetailView: View {
    let account: CoffeeAccount
    var locationService: LocationService

    @State private var detailVM = AccountDetailViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    if account.location != nil {
                        mapPreviewSection
                        locationInfoSection
                        directionsSection
                    }
                    instagramSection
                }
                .padding()
            }
            .navigationTitle(account.displayName ?? account.username)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(.brown.gradient)
                    .frame(width: 80, height: 80)

                Image(systemName: "cup.and.saucer.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.white)
            }

            Text("@\(account.username)")
                .font(.title3)
                .foregroundStyle(.secondary)

            if let rating = account.location?.rating {
                HStack(spacing: 4) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < Int(rating.rounded()) ? "star.fill" : "star")
                            .foregroundStyle(.orange)
                    }
                    Text(String(format: "%.1f", rating))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Map Preview

    private var mapPreviewSection: some View {
        Group {
            if let location = account.location {
                Map(initialPosition: .region(MKCoordinateRegion(
                    center: location.coordinate,
                    latitudinalMeters: 1000,
                    longitudinalMeters: 1000
                ))) {
                    Marker(
                        account.displayName ?? account.username,
                        coordinate: location.coordinate
                    )
                    .tint(.brown)
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .allowsHitTesting(false)
            }
        }
    }

    // MARK: - Location Info

    private var locationInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let address = account.location?.formattedAddress, !address.isEmpty {
                DetailRow(icon: "mappin.circle.fill", title: "Address", value: address)
            }

            if let phone = account.location?.phoneNumber {
                DetailRow(icon: "phone.circle.fill", title: "Phone", value: phone)
            }

            if let website = account.location?.websiteURL {
                Link(destination: website) {
                    DetailRow(icon: "globe", title: "Website", value: website.host ?? website.absoluteString)
                }
            }

            if let distance = distanceText {
                DetailRow(icon: "figure.walk", title: "Distance", value: distance)
            }
        }
        .padding()
        .background(.bar, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Directions

    private var directionsSection: some View {
        VStack(spacing: 12) {
            // Get directions button
            Button {
                detailVM.openInMaps(account: account)
            } label: {
                Label("Get Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.blue, in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(.white)
                    .font(.headline)
            }

            // Show route info if calculated
            if let route = detailVM.route {
                HStack {
                    Label(formatTravelTime(route.expectedTravelTime), systemImage: "car.fill")
                    Spacer()
                    Label(DistanceFormatter.format(meters: route.distance), systemImage: "road.lanes")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            if let error = detailVM.directionsError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .task {
            if let userCoord = locationService.currentCoordinate,
               let destCoord = account.location?.coordinate {
                await detailVM.calculateDirections(from: userCoord, to: destCoord)
            }
        }
    }

    // MARK: - Instagram

    private var instagramSection: some View {
        Button {
            detailVM.openInstagram(account: account)
        } label: {
            Label("View on Instagram", systemImage: "camera.circle.fill")
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [.purple, .pink, .orange],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: RoundedRectangle(cornerRadius: 12)
                )
                .foregroundStyle(.white)
                .font(.headline)
        }
    }

    // MARK: - Helpers

    private var distanceText: String? {
        guard let location = account.location,
              let distance = locationService.distance(to: location.coordinate) else {
            return nil
        }
        return DistanceFormatter.formatWithContext(meters: distance)
    }

    private func formatTravelTime(_ seconds: TimeInterval) -> String {
        let formatter = DateComponentsFormatter()
        formatter.unitsStyle = .abbreviated
        formatter.allowedUnits = [.hour, .minute]
        return formatter.string(from: seconds) ?? ""
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(.brown)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
            }
        }
    }
}
