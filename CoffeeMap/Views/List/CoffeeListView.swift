import SwiftUI
import SwiftData

struct CoffeeListView: View {
    var mapViewModel: MapViewModel
    var locationService: LocationService

    @Query(
        filter: #Predicate<CoffeeAccount> { $0.isCoffeeShop && !$0.isHidden },
        sort: \CoffeeAccount.username
    )
    private var coffeeAccounts: [CoffeeAccount]

    @State private var selectedAccount: CoffeeAccount?

    var body: some View {
        NavigationStack {
            List {
                let located = locatedAccounts
                if located.isEmpty {
                    ContentUnavailableView(
                        "No Coffee Shops Yet",
                        systemImage: "cup.and.saucer",
                        description: Text("Import your Instagram data to find coffee shops you follow.")
                    )
                } else {
                    ForEach(located) { account in
                        CoffeeRowView(
                            account: account,
                            distance: distanceTo(account)
                        )
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedAccount = account
                        }
                    }
                }

                let unresolved = unresolvedAccounts
                if !unresolved.isEmpty {
                    Section("Not Yet Located (\(unresolved.count))") {
                        ForEach(unresolved) { account in
                            Label {
                                Text("@\(account.username)")
                                    .font(.subheadline)
                            } icon: {
                                Image(systemName: account.geocodingStatus == .failed
                                    ? "exclamationmark.triangle"
                                    : "clock")
                                .foregroundStyle(account.geocodingStatus == .failed ? .red : .secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Coffee Shops")
            .sheet(item: $selectedAccount) { account in
                AccountDetailView(
                    account: account,
                    locationService: locationService
                )
            }
        }
    }

    private var locatedAccounts: [CoffeeAccount] {
        let accounts = coffeeAccounts.filter { $0.location != nil }

        guard let userLocation = locationService.currentLocation else {
            return accounts
        }

        return accounts.sorted { a, b in
            let distA = a.location!.clLocation.distance(from: userLocation)
            let distB = b.location!.clLocation.distance(from: userLocation)
            return distA < distB
        }
    }

    private var unresolvedAccounts: [CoffeeAccount] {
        coffeeAccounts.filter { $0.location == nil }
    }

    private func distanceTo(_ account: CoffeeAccount) -> String? {
        guard let location = account.location,
              let distance = locationService.distance(to: location.coordinate) else {
            return nil
        }
        return DistanceFormatter.format(meters: distance)
    }
}
