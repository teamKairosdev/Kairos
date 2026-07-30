import { getDb } from 'db'
import { users } from 'db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { recoverMessageAddress } from 'viem'
import { consumeNonce } from './nonce.get'
import { signSession } from '../../auth'

const WALLET_PASSWORD_PREFIX = 'wallet-'

function makeWalletPassword(address: string): string {
  return WALLET_PASSWORD_PREFIX + address.toLowerCase()
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { address, message, signature, nonce, name } = body || {}

  if (!address || !message || !signature || !nonce) {
    throw createError({ statusCode: 400, statusMessage: '누락된 필드가 있습니다.' })
  }

  if (!consumeNonce(nonce)) {
    throw createError({ statusCode: 400, statusMessage: '유효하지 않거나 만료된 nonce입니다.' })
  }

  let recovered: `0x${string}`
  try {
    recovered = await recoverMessageAddress({ message, signature })
  } catch {
    throw createError({ statusCode: 400, statusMessage: '서명 검증에 실패했습니다.' })
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: '서명자와 지갑 주소가 일치하지 않습니다.' })
  }

  const db = getDb()
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: '데이터베이스에 연결할 수 없습니다.' })
  }

  const addr = address.toLowerCase()
  const password = makeWalletPassword(addr)

  // Check if wallet is already linked
  const [existing] = await db.select().from(users).where(eq(users.walletAddress, addr))

  let user = existing
  let action = 'login'

  if (existing) {
    // Update password hash to wallet password
    const hash = await bcrypt.hash(password, 10)
    await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, existing.id))
  } else {
    // New user — register with wallet-generated email + password
    const email = `wallet-${addr.slice(2, 10)}@kairos.wallet`
    const displayName = name || `Wallet ${addr.slice(0, 6)}...${addr.slice(-4)}`
    const hash = await bcrypt.hash(password, 10)
    action = 'register'

    const [created] = await db.insert(users).values({
      email,
      passwordHash: hash,
      name: displayName,
      walletAddress: addr,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${addr}`,
    }).returning()
    user = created
  }

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
  })

  setCookie(event, 'kairos_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    token,
    action,
  }
})
