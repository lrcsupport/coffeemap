import SwiftUI
import SwiftData
import MapKit

struct CoffeeMapView: View {
    @Bindable var mapViewModel: MapViewModel
    var locationService: LocationService
    var geocodingViewModel: GeocodingViewModel

    @Query(
        filter: #Predicate<CoffeeAccount> { $0.isCoffeeShop && !$0.isHidden },
        sort: \CoffeeAccount.username
    )
    private var allCoffeeAccounts: [CoffeeAccount]

    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            ZStack {
                mapContent
                MapControlsOverlay(
                    mapViewModel: mapViewModel,
                    locationService: locationService,
                    geocodingViewModel: geocodingViewModel,
                    pendingCount: pendingCount
                )
            }
            .navigationTitle("CoffeeMap")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $mapViewModel.searchText, prompt: "Search coffee shops...")
            .sheet(isPresented: $mapViewModel.showingDetail) {
                if let account = mapViewModel.selectedAccount {
                    AccountDetailView(
                        account: account,
                        locationService: locationService
                    )
                }
            }
        }
    }

    private var mapContent: some View {
        Map(position: $mapViewModel.cameraPosition, selection: $mapViewModel.selectedAccount) {
            // User location
            UserAnnotation()

            // Coffee shop annotations
            ForEach(displayedAccounts) { account in
                if let location = account.location {
                    Annotation(
                        account.displayName ?? account.username,
                        coordinate: location.coordinate,
                        anchor: .bottom
                    ) {
                        CoffeeAnnotationView(account: account)
                            .onTapGesture {
                                mapViewModel.select(account)
                            }
                    }
                    .tag(account)
                }
            }
        }
        .mapControls {
            MapCompass()
            MapScaleView()
        }
        .mapStyle(.standard(pointsOfInterest: .including([.cafe, .restaurant])))
    }

    private var displayedAccounts: [CoffeeAccount] {
        mapViewModel.filteredAccounts(from: allCoffeeAccounts)
    }

    private var pendingCount: Int {
        allCoffeeAccounts.filter { $0.geocodingStatus == .pending }.count
    }
}
