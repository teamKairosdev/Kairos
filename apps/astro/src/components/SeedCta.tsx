import { ActionButton } from "seed-design/ui/action-button"
import type { FC } from "react"

const SeedCta: FC = () => (
  <section
    style={{
      textAlign: "center",
      padding: "4rem 2rem",
      background: "linear-gradient(135deg, #0a0a0b 0%, #1a0a2e 50%, #0a0a0b 100%)",
    }}
  >
    <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#e4e4e7", marginBottom: "1rem" }}>
      SEED Design Ready
    </h2>
    <p style={{ color: "#a1a1aa", marginBottom: "2rem" }}>
      React Island with SSR noExternal
    </p>
    <ActionButton>Kairos 시작하기</ActionButton>
  </section>
)

export default SeedCta
