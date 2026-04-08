import Foundation
import MapKit

@Observable
final class AccountDetailViewModel {
    var route: MKRoute?
    var isLoadingDirections = false
    var directionsError: String?

    /// Calculates driving directions from the user's location to the account's location.
    func calculateDirections(
        from source: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D
    ) async {
        isLoadingDirections = true
        directionsError = nil
        route = nil

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile

        let directions = MKDirections(request: request)

        do {
            let response = try await directions.calculate()
            route = response.routes.first
        } catch {
            directionsError = "Could not calculate directions: \(error.localizedDescription)"
        }

        isLoadingDirections = false
    }

    /// Opens Apple Maps with directions to the location.
    func openInMaps(account: CoffeeAccount) {
        guard let location = account.location else { return }

        let destination = MKMapItem(placemark: MKPlacemark(coordinate: location.coordinate))
        destination.name = account.displayName ?? account.username

        destination.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ])
    }

    /// Opens the account's Instagram profile in the Instagram app or Safari.
    func openInstagram(account: CoffeeAccount) {
        let instagramAppURL = URL(string: "instagram://user?username=\(account.username)")!
        let webURL = account.profileURL

        if UIApplication.shared.canOpenURL(instagramAppURL) {
            UIApplication.shared.open(instagramAppURL)
        } else {
            UIApplication.shared.open(webURL)
        }
    }
}
