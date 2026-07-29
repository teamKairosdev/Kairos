import { ActionButton } from "seed-design/ui/action-button"
import type { FC } from "react"

const SeedCta: FC = () => (
  <section
    style={{
      textAlign: "center",
      padding: "4rem 2rem",
      background: "linear-gradient(135deg, var(--seed-bg-neutral-default) 0%, var(--seed-bg-neutral-strong) 50%, var(--seed-bg-neutral-default) 100%)",
    }}
  >
    <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--seed-fg-neutral)", marginBottom: "1rem" }}>
      SEED Design Ready
    </h2>
    <p style={{ color: "var(--seed-fg-neutral-muted)", marginBottom: "2rem" }}>
      React Island with SSR noExternal
    </p>
    <ActionButton>Kairos 시작하기</ActionButton>
  </section>
)

export default SeedCta
