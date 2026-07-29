import { ActionButton } from "seed-design/ui/action-button"

export default function SeedHero() {
  return (
    <section style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0b 0%, #1a0a2e 50%, #0a0a0b 100%)',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '640px' }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #c084fc, #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          AI Career Steward
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#9ca3af', marginBottom: '2rem' }}>
          SEED Design + Astro Islands + Nuxt
        </p>
        <ActionButton>시작하기</ActionButton>
      </div>
    </section>
  )
}
