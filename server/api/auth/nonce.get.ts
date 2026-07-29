import { randomBytes } from 'node:crypto'

const nonces = new Map<string, { nonce: string; expiresAt: number }>()

export function consumeNonce(nonce: string): boolean {
  for (const [key, val] of nonces) {
    if (val.nonce === nonce && val.expiresAt > Date.now()) {
      nonces.delete(key)
      return true
    }
    if (val.expiresAt <= Date.now()) nonces.delete(key)
  }
  return false
}

export default defineEventHandler(async () => {
  const id = randomBytes(16).toString('hex')
  const nonce = randomBytes(32).toString('hex')
  nonces.set(id, { nonce, expiresAt: Date.now() + 5 * 60 * 1000 }) // 5 min TTL
  return { nonce, id }
})
