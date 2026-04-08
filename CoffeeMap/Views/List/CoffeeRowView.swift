import SwiftUI

struct CoffeeRowView: View {
    let account: CoffeeAccount
    let distance: String?

    var body: some View {
        HStack(spacing: 12) {
            // Coffee icon
            ZStack {
                Circle()
                    .fill(.brown.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: "cup.and.saucer.fill")
                    .foregroundStyle(.brown)
                    .font(.title3)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(account.displayName ?? account.username)
                    .font(.headline)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text("@\(account.username)")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let city = account.location?.city {
                        Text(city)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if let rating = account.location?.rating {
                    HStack(spacing: 2) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < Int(rating.rounded()) ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundStyle(.orange)
                        }
                        Text(String(format: "%.1f", rating))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            if let distance {
                Text(distance)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}
