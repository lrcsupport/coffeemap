import SwiftUI
import SwiftData

@main
struct CoffeeMapApp: App {
    let modelContainer: ModelContainer

    init() {
        do {
            let schema = Schema([CoffeeAccount.self, CoffeeLocation.self])
            let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            modelContainer = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(modelContainer)
    }
}
