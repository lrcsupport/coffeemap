import SwiftUI

struct CoffeeAnnotationView: View {
    let account: CoffeeAccount

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(.brown)
                    .frame(width: 36, height: 36)

                Image(systemName: "cup.and.saucer.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(.white)
            }
            .shadow(color: .black.opacity(0.3), radius: 3, y: 2)

            // Triangle pointer
            Triangle()
                .fill(.brown)
                .frame(width: 12, height: 8)
        }
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.closeSubpath()
        }
    }
}
