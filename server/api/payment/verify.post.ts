export default defineEventHandler(async (event) => {
  const { orderId, paymentKey, amount } = await readBody(event)
  if (!orderId || !paymentKey || !amount) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment parameters' })
  }

  const secretKey = useRuntimeConfig().tossSecretKey
  if (!secretKey) {
    return { status: 'demo', message: 'Toss Payments secret key not configured (demo mode)' }
  }

  const response = await fetch(`https://api.tosspayments.com/v1/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId, paymentKey, amount }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw createError({ statusCode: 400, statusMessage: err.message || 'Payment verification failed' })
  }

  const data = await response.json()

  return {
    status: 'completed',
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    amount: data.totalAmount,
    method: data.method,
  }
})
