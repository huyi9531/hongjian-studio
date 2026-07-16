export function createLoginRateLimiter(maxFailures = 5, lockDurationMs = 15 * 60 * 1000) {
  let failures = 0
  let lockedUntil = 0

  return {
    assertAllowed(now = Date.now()) {
      if (lockedUntil > now) throw new Error(`登录尝试过多，请在 ${Math.ceil((lockedUntil - now) / 60_000)} 分钟后重试`)
      if (lockedUntil) { lockedUntil = 0; failures = 0 }
    },
    recordFailure(now = Date.now()) {
      failures += 1
      if (failures >= maxFailures) {
        lockedUntil = now + lockDurationMs
        failures = 0
        throw new Error(`登录尝试过多，请在 ${Math.ceil(lockDurationMs / 60_000)} 分钟后重试`)
      }
    },
    reset() {
      failures = 0
      lockedUntil = 0
    },
  }
}
