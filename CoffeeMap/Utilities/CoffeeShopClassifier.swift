import Foundation

struct CoffeeShopClassifier {
    /// Determines if an Instagram username is likely a coffee shop or roastery
    /// based on keyword matching in the username.
    func isCoffeeRelated(username: String) -> Bool {
        let lowered = username.lowercased()
        return Configuration.coffeeKeywords.contains { keyword in
            lowered.contains(keyword)
        }
    }

    /// Classifies a batch of usernames and returns those identified as coffee-related.
    func classify(usernames: [String]) -> [String] {
        usernames.filter { isCoffeeRelated(username: $0) }
    }

    /// Returns a confidence score (0.0 - 1.0) based on how many coffee keywords match.
    func confidence(for username: String) -> Double {
        let lowered = username.lowercased()
        let matchCount = Configuration.coffeeKeywords.filter { lowered.contains($0) }.count
        // Cap at 1.0, with each keyword match contributing 0.4
        return min(1.0, Double(matchCount) * 0.4)
    }
}
