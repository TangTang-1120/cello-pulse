import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, mixMetronome, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp-full2k')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-样式demo-2K.mov')
const wavPath = join(tmp, 'full.wav')
const W = 430
const H = 860
const SCALE = 3
const bpm = 72
const beat = 60 / bpm
const bar = beat * 4
const C2 = 65.41
const G2 = 98
const D2 = 73.42
const A3 = 220

function centsToHz(hz, cents) {
  return hz * 2 ** (cents / 1200)
}

const t0 = 0.4
const tLow = t0
const tOk = tLow + bar
const tHigh = tOk + bar
const tMetro = tHigh + bar + 0.4
const tPos = tMetro + 8 * beat + 0.45
const total = tPos + 8.6

function buildAudio() {
  const samples = new Float32Array(Math.ceil(total * 44100))
  mixBow(samples, tLow, bar, centsToHz(C2, -22))
  mixBow(samples, tOk, bar, C2)
  mixBow(samples, tHigh, bar, centsToHz(C2, 22))
  mixMetronome(samples, tMetro, 8, bpm)
  mixBow(samples, tPos, 2.05, C2)
  mixBow(samples, tPos + 2.1, 2.05, D2)
  mixBow(samples, tPos + 4.2, 2.05, G2)
  mixBow(samples, tPos + 6.3, 2.2, A3)
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
  await sleep(t0 * 1000)
  await page.evaluate(() => window.__celloTutorial.listen(true))
  await page.evaluate(() => window.__celloTutorial.showString('C', -22))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 0))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 22))
  await sleep(bar * 1000)
  await page.evaluate(() => {
    window.__celloTutorial.listen(false)
    window.__celloTutorial.setTab('metronome')
  })
  await sleep(400)
  await page.getByRole('button', { name: '开始节拍' }).click()
  await sleep(8 * beat * 1000 + 200)
  await page.getByRole('button', { name: '停止' }).click()
  await sleep(250)
  await page.evaluate(() => {
    window.__celloTutorial.setTab('position')
    window.__celloTutorial.listen(true)
    window.__celloTutorial.showString('C', 0)
  })
  await sleep(2100)
  await page.evaluate(() => window.__celloTutorial.showString('C', 200))
  await sleep(2100)
  await page.evaluate(() => window.__celloTutorial.showString('G', 0))
  await sleep(2100)
  await page.evaluate(() => window.__celloTutorial.showString('A', 0))
  await sleep(2300)
  await page.evaluate(() => window.__celloTutorial.listen(false))
  await sleep(300)

  const video = page.video()
  await page.close()
  const webm = await video.path()
  await context.close()
  await browser.close()
  console.log(
    `Wrote ${await muxToMov({
      webm,
      wav: wavPath,
      out: outVideo,
      seconds: Math.ceil(total),
      width: W * SCALE,
      height: H * SCALE,
    })}`,
  )
}

await record()
