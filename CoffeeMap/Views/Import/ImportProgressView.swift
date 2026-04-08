import SwiftUI

struct ImportProgressView: View {
    var viewModel: GeocodingViewModel

    var body: some View {
        VStack(spacing: 12) {
            ProgressView(value: viewModel.progress) {
                HStack {
                    Text("Finding locations...")
                        .font(.subheadline)
                    Spacer()
                    Text("\(viewModel.completedCount)/\(viewModel.totalToGeocode)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let current = viewModel.currentUsername {
                Text("Looking up @\(current)...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if viewModel.failedCount > 0 {
                Text("\(viewModel.failedCount) could not be located")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
        .padding()
        .background(.bar, in: RoundedRectangle(cornerRadius: 12))
    }
}
