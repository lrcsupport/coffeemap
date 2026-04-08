import SwiftUI

struct OnboardingView: View {
    @Bindable var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // App icon
            ZStack {
                Circle()
                    .fill(.brown.gradient)
                    .frame(width: 120, height: 120)

                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(.white)
            }
            .padding(.bottom, 24)

            Text("CoffeeMap")
                .font(.largeTitle.bold())
                .padding(.bottom, 8)

            Text("Discover coffee shops you already love")
                .font(.title3)
                .foregroundStyle(.secondary)
                .padding(.bottom, 40)

            // Feature list
            VStack(alignment: .leading, spacing: 20) {
                OnboardingFeature(
                    icon: "square.and.arrow.down",
                    title: "Import from Instagram",
                    description: "Use your Instagram data export to find coffee shops and roasteries you follow."
                )

                OnboardingFeature(
                    icon: "map.fill",
                    title: "See Them on a Map",
                    description: "All your followed coffee accounts, mapped to their real-world locations."
                )

                OnboardingFeature(
                    icon: "location.fill",
                    title: "Get Nearby Alerts",
                    description: "Receive a notification when you're near a coffee shop you follow."
                )
            }
            .padding(.horizontal, 32)

            Spacer()

            Button {
                appState.hasCompletedOnboarding = true
            } label: {
                Text("Get Started")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.brown, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(.white)
                    .font(.headline)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
    }
}

struct OnboardingFeature: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.brown)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
