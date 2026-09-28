import { existsSync, copyFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = dirname(fileURLToPath(import.meta.url))

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}`))))
  })
}

export function writeWav(path, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(44100, 24)
  buffer.writeUInt32LE(44100 * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(path, buffer)
}

export function celloBow(hz, t) {
  return (
    0.5 * Math.sin(2 * Math.PI * hz * t) +
    0.24 * Math.sin(4 * Math.PI * hz * t) +
    0.12 * Math.sin(6 * Math.PI * hz * t) +
    0.06 * Math.sin(8 * Math.PI * hz * t) +
    0.03 * Math.sin(10 * Math.PI * hz * t)
  )
}

export function mixBow(samples, startSec, dur, hz, rate = 44100) {
  const start = Math.floor(startSec * rate)
  const n = Math.floor(dur * rate)
  const attack = 0.18
  const release = 0.28
  for (let i = 0; i < n; i++) {
    const t = i / rate
    let fade = 1
    if (t < attack) fade = t / attack
    else if (dur - t < release) fade = Math.max(0, (dur - t) / release)
    const idx = start + i
    if (idx < samples.length) samples[idx] += celloBow(hz, t) * fade * 0.82
  }
}

export function mixMetronome(samples, startSec, beats, bpm = 72, rate = 44100) {
  const interval = 60 / bpm
  for (let b = 0; b < beats; b++) {
    const accent = b % 4 === 0
    const start = Math.floor((startSec + b * interval) * rate)
    const n = Math.floor(0.055 * rate)
    const f = accent ? 1320 : 880
    const amp = accent ? 0.36 : 0.2
    for (let i = 0; i < n; i++) {
      const t = i / rate
      const env = Math.exp(-t * 58)
      const idx = start + i
      if (idx < samples.length) samples[idx] += env * amp * Math.sign(Math.sin(2 * Math.PI * f * t))
    }
  }
}

export function resolveFfmpeg() {
  const candidates = [
    process.env.FFMPEG,
    join(root, '../.tools/ffmpeg'),
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ].filter(Boolean)
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return 'ffmpeg'
}

export async function launchChrome(width = 2560, height = 1440) {
  return chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [`--window-size=${width},${height}`, '--autoplay-policy=no-user-gesture-required'],
  })
}

export async function muxToMov({
  webm,
  wav,
  out,
  seconds = 15,
  width,
  height,
}) {
  const ff = resolveFfmpeg()
  const vf = width && height ? `scale=${width}:${height}:flags=lanczos,fps=30` : undefined
  try {
    await run(ff, [
      '-y',
      '-i',
      webm,
      '-i',
      wav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-t',
      String(seconds),
      ...(vf ? ['-vf', vf] : []),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '12',
      '-preset',
      'slow',
      '-c:a',
      'aac',
      '-b:a',
      '320k',
      '-movflags',
      '+faststart',
      '-f',
      'mov',
      out,
    ])
    return out
  } catch (error) {
    const fallback = out.replace(/\.mov$/i, '.webm')
    copyFileSync(webm, fallback)
    if (existsSync(wav)) copyFileSync(wav, fallback.replace(/\.webm$/i, '.wav'))
    console.warn(`ffmpeg mux failed (${error instanceof Error ? error.message : error}), wrote ${fallback}`)
    return fallback
  }
}
