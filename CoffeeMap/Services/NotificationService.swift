import Foundation
import UserNotifications
import os

actor NotificationService {
    private let logger = Logger(subsystem: "com.coffeemap", category: "Notifications")
    private let center = UNUserNotificationCenter.current()

    func requestAuthorization() async -> Bool {
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            logger.info("Notification authorization: \(granted)")
            return granted
        } catch {
            logger.error("Failed to request notification authorization: \(error)")
            return false
        }
    }

    /// Sends a local notification when the user enters a coffee shop's geofence.
    func sendProximityAlert(identifier: String) async {
        let content = UNMutableNotificationContent()
        content.title = "Coffee Nearby! ☕"
        content.body = "You're near \(formatName(identifier)). Tap to see details."
        content.sound = .default
        content.userInfo = ["accountUsername": identifier]

        let request = UNNotificationRequest(
            identifier: "proximity-\(identifier)-\(Date.now.timeIntervalSince1970)",
            content: content,
            trigger: nil // Deliver immediately
        )

        do {
            try await center.add(request)
            logger.info("Sent proximity alert for \(identifier)")
        } catch {
            logger.error("Failed to send notification: \(error)")
        }
    }

    private func formatName(_ identifier: String) -> String {
        // Convert username-style identifiers to readable names
        identifier
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: ".", with: " ")
            .capitalized
    }
}
