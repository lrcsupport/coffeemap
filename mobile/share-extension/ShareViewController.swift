import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    private var sharedURL: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        extractSharedURL()
    }

    override func isContentValid() -> Bool {
        return sharedURL != nil
    }

    override func didSelectPost() {
        if let handle = extractInstagramHandle(from: sharedURL) {
            let urlString = "coffeemap://add?handle=\(handle)"
            if let url = URL(string: urlString) {
                openURL(url)
            }
        }
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        return []
    }

    // MARK: - URL Extraction

    private func extractSharedURL() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else { return }

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }

            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] item, _ in
                        if let url = item as? URL {
                            DispatchQueue.main.async {
                                self?.sharedURL = url.absoluteString
                                self?.validateContent()
                            }
                        }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, _ in
                        if let text = item as? String, text.contains("instagram.com") {
                            DispatchQueue.main.async {
                                self?.sharedURL = text
                                self?.validateContent()
                            }
                        }
                    }
                }
            }
        }
    }

    private func extractInstagramHandle(from urlString: String?) -> String? {
        guard let urlString = urlString else { return nil }

        // Match instagram.com/username patterns
        let patterns = [
            "instagram\\.com/([a-zA-Z0-9_.]+)",
            "instagr\\.am/([a-zA-Z0-9_.]+)"
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: urlString, range: NSRange(urlString.startIndex..., in: urlString)),
               let range = Range(match.range(at: 1), in: urlString) {
                let handle = String(urlString[range]).lowercased()
                // Filter out non-profile paths
                let reserved = ["p", "reel", "reels", "stories", "explore", "accounts", "direct", "tv"]
                if !reserved.contains(handle) {
                    return handle
                }
            }
        }

        return nil
    }

    // MARK: - Open Main App

    @objc private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = r.next
        }
        // Fallback: use selector-based approach for extensions
        let selector = sel_registerName("openURL:")
        var currentResponder: UIResponder? = self
        while let r = currentResponder {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            currentResponder = r.next
        }
    }
}
