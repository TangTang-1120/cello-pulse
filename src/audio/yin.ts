/**
 * YIN fundamental-frequency estimator
 * de Cheveigné & Kawahara, JASA 2002
 */
export function detectPitchYin(
  samples: Float32Array,
  sampleRate: number,
  options?: {
    threshold?: number
    minHz?: number
    maxHz?: number
  },
): { frequency: number; probability: number } | null {
  const threshold = options?.threshold ?? 0.12
  const minHz = options?.minHz ?? 55
  const maxHz = options?.maxHz ?? 320
  const yinBufferLength = Math.floor(samples.length / 2)
  const yinBuffer = new Float32Array(yinBufferLength)

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz))
  const tauMax = Math.min(yinBufferLength - 1, Math.floor(sampleRate / minHz))

  yinBuffer[0] = 1
  let runningSum = 0

  for (let tau = 1; tau < yinBufferLength; tau++) {
    let sum = 0
    for (let i = 0; i < yinBufferLength; i++) {
      const delta = samples[i] - samples[i + tau]
      sum += delta * delta
    }
    runningSum += sum
    yinBuffer[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum
  }

  let tau = tauMin
  while (tau < tauMax) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < tauMax && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++
      }
      break
    }
    tau++
  }

  if (tau === tauMax || yinBuffer[tau] >= threshold) {
    return null
  }

  const probability = 1 - yinBuffer[tau]
  if (probability < 0.85) {
    return null
  }

  const betterTau = parabolicInterpolation(yinBuffer, tau)
  return {
    frequency: sampleRate / betterTau,
    probability,
  }
}

function parabolicInterpolation(buffer: Float32Array, tau: number): number {
  const x0 = tau < 1 ? tau : tau - 1
  const x2 = tau + 1 < buffer.length ? tau + 1 : tau
  if (x0 === tau) {
    return buffer[tau] <= buffer[x2] ? tau : x2
  }
  if (x2 === tau) {
    return buffer[tau] <= buffer[x0] ? tau : x0
  }
  const s0 = buffer[x0]
  const s1 = buffer[tau]
  const s2 = buffer[x2]
  const denom = 2 * (2 * s1 - s2 - s0)
  if (denom === 0) return tau
  return tau + (s2 - s0) / denom
}
