import Foundation
import SwiftData
import os

@Observable
final class ImportViewModel {
    private let importService = InstagramImportService()
    private let logger = Logger(subsystem: "com.coffeemap", category: "ImportVM")

    var importState: ImportState = .idle
    var importedAccounts: [CoffeeAccount] = []
    var errorMessage: String?

    enum ImportState: Equatable {
        case idle
        case parsing
        case reviewing
        case importing
        case complete(newCount: Int, duplicateCount: Int)
        case error
    }

    /// Handles the imported file URL from the document picker.
    func handleFileImport(url: URL, modelContext: ModelContext) async {
        importState = .parsing
        errorMessage = nil

        do {
            let entries = try await importService.parseExportFile(at: url)

            if entries.isEmpty {
                errorMessage = "No following accounts found in this file."
                importState = .error
                return
            }

            importState = .importing
            let result = try await importService.importEntries(entries, into: modelContext)

            // Fetch the newly imported accounts for review
            let descriptor = FetchDescriptor<CoffeeAccount>(
                sortBy: [SortDescriptor(\.username)]
            )
            importedAccounts = (try? modelContext.fetch(descriptor)) ?? []

            importState = .complete(
                newCount: result.newlyImported,
                duplicateCount: result.duplicatesSkipped
            )
        } catch {
            logger.error("Import failed: \(error)")
            errorMessage = error.localizedDescription
            importState = .error
        }
    }

    /// Toggles whether an account is marked as a coffee shop.
    func toggleCoffeeShop(_ account: CoffeeAccount, modelContext: ModelContext) {
        account.isCoffeeShop.toggle()
        try? modelContext.save()
    }

    /// Marks all currently classified coffee accounts and saves.
    func confirmSelections(modelContext: ModelContext) {
        try? modelContext.save()
    }

    func reset() {
        importState = .idle
        importedAccounts = []
        errorMessage = nil
    }
}
