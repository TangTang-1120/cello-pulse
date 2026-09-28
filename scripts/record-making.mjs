import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp-making')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-制作过程-2K.mov')
const wavPath = join(tmp, 'making.wav')
const sampleRate = 44100

function buildAudio() {
  const samples = new Float32Array(Math.ceil(15 * sampleRate))
  mixBow(samples, 0.2, 2.6, 65.41 * 2 ** (-16 / 1200))
  mixBow(samples, 3.0, 2.6, 65.41)
  mixBow(samples, 5.8, 2.6, 65.41 * 2 ** (16 / 1200))
  mixBow(samples, 8.6, 2.4, 98)
  mixBow(samples, 11.2, 3.5, 220)
  writeWav(wavPath, samples)
}

async function record() {
  mkdirSync(tmp, { recursive: true })
  buildAudio()
  const browser = await launchChrome()
  const context = await browser.newContext({
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: 2560, height: 1440 } },
  })
  await context.addInitScript(() => {
    localStorage.setItem('cello.studio.webUnlocked', '1')
    localStorage.setItem('cello.studio.trialStartedAt', String(Date.now()))
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/making.html', { waitUntil: 'networkidle' })
  await sleep(15200)
  const video = page.video()
  await page.close()
  const webm = await video.path()
  await context.close()
  await browser.close()
  console.log(`Wrote ${await muxToMov({ webm, wav: wavPath, out: outVideo })}`)
}

await record()
