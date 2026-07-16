import { describe, expect, it } from 'vitest'
import { createLoginRateLimiter } from './login-rate-limit'

describe('createLoginRateLimiter', () => {
  it('locks after five failed attempts and resets after a successful login', () => {
    const limiter = createLoginRateLimiter()
    for (let attempt = 0; attempt < 4; attempt += 1) limiter.recordFailure(1_000)
    expect(() => limiter.recordFailure(1_000)).toThrow('15 分钟后重试')
    expect(() => limiter.assertAllowed(1_001)).toThrow('15 分钟后重试')
    limiter.reset()
    expect(() => limiter.assertAllowed(1_001)).not.toThrow()
  })
})
