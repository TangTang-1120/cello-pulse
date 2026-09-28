import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp-pitch')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-调音偏差demo.mov')
const wavPath = join(tmp, 'pitch.wav')
const W = 430
const H = 860
const bpm = 72
const bar = (60 / bpm) * 4
const total = 12.2
const C2 = 65.41

function centsToHz(hz, cents) {
  return hz * 2 ** (cents / 1200)
}

function buildAudio() {
  const samples = new Float32Array(Math.ceil(total * 44100))
  mixBow(samples, 0.4, bar, centsToHz(C2, -22))
  mixBow(samples, 0.4 + bar, bar, C2)
  mixBow(samples, 0.4 + bar * 2, bar, centsToHz(C2, 22))
  writeWav(wavPath, samples)
}

async function record() {
  mkdirSync(tmp, { recursive: true })
  buildAudio()
  const browser = await launchChrome(W, H)
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: W, height: H } },
  })
  await context.addInitScript(() => {
    localStorage.setItem('cello.studio.webUnlocked', '1')
    localStorage.setItem('cello.studio.trialStartedAt', String(Date.now()))
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/?demo=1&record=1', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(window.__celloTutorial))
  await sleep(400)
  await page.evaluate(() => window.__celloTutorial.listen(true))
  await page.evaluate(() => window.__celloTutorial.showString('C', -22))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 0))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 22))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.listen(false))
  await sleep(350)

  const video = page.video()
  await page.close()
  const webm = await video.path()
  await context.close()
  await browser.close()
  console.log(`Wrote ${await muxToMov({ webm, wav: wavPath, out: outVideo, seconds: 12 })}`)
}

await record()
