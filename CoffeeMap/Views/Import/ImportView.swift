import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct ImportView: View {
    var geocodingViewModel: GeocodingViewModel

    @State private var importVM = ImportViewModel()
    @State private var showingFilePicker = false
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \CoffeeAccount.username)
    private var allAccounts: [CoffeeAccount]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    importInstructions
                    importButton
                    stateContent
                    if !allAccounts.isEmpty {
                        accountReviewSection
                    }
                }
                .padding()
            }
            .navigationTitle("Import")
            .fileImporter(
                isPresented: $showingFilePicker,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                handleFileSelection(result)
            }
        }
    }

    // MARK: - Instructions

    private var importInstructions: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("How to Import", systemImage: "info.circle")
                .font(.headline)

            VStack(alignment: .leading, spacing: 12) {
                InstructionStep(number: 1, text: "Open Instagram and go to Settings > Your Activity > Download Your Information")
                InstructionStep(number: 2, text: "Request your data in JSON format")
                InstructionStep(number: 3, text: "Wait for Instagram to prepare your download (may take up to 48 hours)")
                InstructionStep(number: 4, text: "Download and extract the ZIP file")
                InstructionStep(number: 5, text: "Find the 'following.json' file in the 'connections/followers_and_following' folder")
                InstructionStep(number: 6, text: "Tap 'Import File' below and select that JSON file")
            }
        }
        .padding()
        .background(.bar, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Import Button

    private var importButton: some View {
        Button {
            showingFilePicker = true
        } label: {
            Label("Import File", systemImage: "doc.badge.plus")
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue, in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.white)
                .font(.headline)
        }
        .disabled(importVM.importState == .parsing || importVM.importState == .importing)
    }

    // MARK: - State Content

    @ViewBuilder
    private var stateContent: some View {
        switch importVM.importState {
        case .idle:
            EmptyView()

        case .parsing, .importing:
            VStack(spacing: 8) {
                ProgressView()
                Text(importVM.importState == .parsing ? "Parsing file..." : "Importing accounts...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()

        case .complete(let newCount, let duplicateCount):
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.green)

                Text("Import Complete")
                    .font(.headline)

                Text("\(newCount) new accounts imported")
                    .foregroundStyle(.secondary)

                if duplicateCount > 0 {
                    Text("\(duplicateCount) duplicates skipped")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()

        case .reviewing:
            EmptyView()

        case .error:
            VStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.red)

                Text("Import Failed")
                    .font(.headline)

                if let error = importVM.errorMessage {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding()
        }
    }

    // MARK: - Account Review

    private var accountReviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Your Accounts (\(allAccounts.count))")
                    .font(.headline)

                Spacer()

                let coffeeCount = allAccounts.filter(\.isCoffeeShop).count
                Text("\(coffeeCount) coffee shops")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("Toggle accounts that are coffee shops or roasteries. The app auto-detects based on username keywords.")
                .font(.caption)
                .foregroundStyle(.secondary)

            LazyVStack(spacing: 0) {
                ForEach(allAccounts) { account in
                    AccountFilterRow(account: account) {
                        importVM.toggleCoffeeShop(account, modelContext: modelContext)
                    }
                    Divider()
                }
            }
            .background(.bar, in: RoundedRectangle(cornerRadius: 12))

            // Geocode button
            let pendingCount = allAccounts.filter { $0.isCoffeeShop && $0.geocodingStatus == .pending }.count
            if pendingCount > 0 {
                Button {
                    Task {
                        await geocodingViewModel.geocodePendingAccounts(
                            modelContext: modelContext
                        )
                    }
                } label: {
                    Label("Find Locations (\(pendingCount) pending)", systemImage: "location.magnifyingglass")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.green, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                        .font(.headline)
                }
                .disabled(geocodingViewModel.isGeocoding)
            }

            if geocodingViewModel.isGeocoding {
                ImportProgressView(viewModel: geocodingViewModel)
            }
        }
    }

    // MARK: - Helpers

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            Task {
                await importVM.handleFileImport(url: url, modelContext: modelContext)
            }
        case .failure(let error):
            importVM.errorMessage = error.localizedDescription
            importVM.importState = .error
        }
    }
}

// MARK: - Instruction Step

struct InstructionStep: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption.bold())
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(.brown, in: Circle())

            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Account Filter Row

struct AccountFilterRow: View {
    let account: CoffeeAccount
    let onToggle: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("@\(account.username)")
                    .font(.subheadline)

                HStack(spacing: 4) {
                    statusIcon
                    Text(statusText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { account.isCoffeeShop },
                set: { _ in onToggle() }
            ))
            .labelsHidden()
            .tint(.brown)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    private var statusIcon: some View {
        Group {
            switch account.geocodingStatus {
            case .resolved:
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
            case .failed:
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
            case .pending:
                Image(systemName: "clock").foregroundStyle(.orange)
            case .manual:
                Image(systemName: "hand.point.up.fill").foregroundStyle(.blue)
            }
        }
        .font(.caption)
    }

    private var statusText: String {
        switch account.geocodingStatus {
        case .resolved: return account.location?.city ?? "Located"
        case .failed: return "Location not found"
        case .pending: return "Pending"
        case .manual: return "Manually placed"
        }
    }
}
