import Foundation
import SwiftData
import os

actor InstagramImportService {
    private let logger = Logger(subsystem: "com.coffeemap", category: "InstagramImport")

    struct ImportResult {
        let totalFound: Int
        let newlyImported: Int
        let duplicatesSkipped: Int
    }

    /// Parses an Instagram data export JSON file and returns following entries.
    /// Handles both the wrapped format (with "relationships_following" key) and flat array format.
    func parseExportFile(at url: URL) throws -> [InstagramFollowingEntry] {
        let data: Data
        do {
            // Need to start accessing security-scoped resource for files from document picker
            let accessing = url.startAccessingSecurityScopedResource()
            defer {
                if accessing { url.stopAccessingSecurityScopedResource() }
            }
            data = try Data(contentsOf: url)
        } catch {
            logger.error("Failed to read file at \(url): \(error)")
            throw ImportError.fileReadFailed(error)
        }

        let decoder = JSONDecoder()

        // Try wrapped format first
        if let wrapped = try? decoder.decode(InstagramExportWrapped.self, from: data) {
            logger.info("Parsed wrapped format with \(wrapped.relationships_following.count) entries")
            return wrapped.relationships_following
        }

        // Try flat array format
        if let flat = try? decoder.decode([InstagramFollowingEntry].self, from: data) {
            logger.info("Parsed flat array format with \(flat.count) entries")
            return flat
        }

        logger.error("Failed to decode Instagram export JSON in either format")
        throw ImportError.invalidFormat
    }

    /// Imports parsed entries into SwiftData, skipping duplicates.
    func importEntries(
        _ entries: [InstagramFollowingEntry],
        into modelContext: ModelContext,
        classifier: CoffeeShopClassifier = CoffeeShopClassifier()
    ) throws -> ImportResult {
        var newlyImported = 0
        var duplicatesSkipped = 0

        for entry in entries {
            guard let stringData = entry.string_list_data.first else { continue }

            let username = stringData.value.lowercased()
                .trimmingCharacters(in: .whitespacesAndNewlines)

            // Check for existing account
            let predicate = #Predicate<CoffeeAccount> { $0.username == username }
            let descriptor = FetchDescriptor<CoffeeAccount>(predicate: predicate)

            let existing = (try? modelContext.fetch(descriptor)) ?? []
            if !existing.isEmpty {
                duplicatesSkipped += 1
                continue
            }

            let followDate = Date(timeIntervalSince1970: TimeInterval(stringData.timestamp))
            let profileURL = URL(string: stringData.href)

            let account = CoffeeAccount(
                username: username,
                profileURL: profileURL,
                followTimestamp: followDate,
                isCoffeeShop: classifier.isCoffeeRelated(username: username)
            )

            modelContext.insert(account)
            newlyImported += 1
        }

        try modelContext.save()

        logger.info("Import complete: \(newlyImported) new, \(duplicatesSkipped) duplicates")
        return ImportResult(
            totalFound: entries.count,
            newlyImported: newlyImported,
            duplicatesSkipped: duplicatesSkipped
        )
    }

    enum ImportError: LocalizedError {
        case fileReadFailed(Error)
        case invalidFormat

        var errorDescription: String? {
            switch self {
            case .fileReadFailed(let error):
                return "Could not read the file: \(error.localizedDescription)"
            case .invalidFormat:
                return "The file doesn't appear to be a valid Instagram following export. Please use the JSON file from your Instagram data download."
            }
        }
    }
}
