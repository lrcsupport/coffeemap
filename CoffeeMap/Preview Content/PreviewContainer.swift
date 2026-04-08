import SwiftData

@MainActor
let previewContainer: ModelContainer = {
    do {
        let schema = Schema([CoffeeAccount.self, CoffeeLocation.self])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [config])

        // Insert sample data
        for account in SampleData.sampleAccounts {
            container.mainContext.insert(account)
        }
        try container.mainContext.save()

        return container
    } catch {
        fatalError("Failed to create preview container: \(error)")
    }
}()
