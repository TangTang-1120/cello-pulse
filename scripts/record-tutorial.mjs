import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, mixMetronome, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-试用教程-2K.mov')
const wavPath = join(tmp, 'tutorial.wav')
const bpm = 72
const beat = 60 / bpm
const bar = beat * 4

function centsToHz(hz, cents) {
  return hz * 2 ** (cents / 1200)
}

function buildAudio() {
  const samples = new Float32Array(Math.ceil(19 * 44100))
  mixBow(samples, 0.3, bar, centsToHz(65.41, -18))
  mixBow(samples, 0.3 + bar, bar, 65.41)
  mixBow(samples, 0.3 + bar * 2, bar, centsToHz(65.41, 18))
  mixMetronome(samples, 0.3 + bar * 3 + 0.45, 8, bpm)
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
  await page.goto('http://127.0.0.1:5173/?demo=1', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(window.__celloTutorial))
  await page.evaluate(() => window.__celloTutorial.listen(true))
  await sleep(300)
  await page.evaluate(() => window.__celloTutorial.showString('C', -18))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 0))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('C', 18))
  await sleep(bar * 1000)
  await page.evaluate(() => {
    window.__celloTutorial.listen(false)
    window.__celloTutorial.setTab('metronome')
  })
  await sleep(450)
  await page.getByRole('button', { name: '开始节拍' }).click()
  await sleep(8 * beat * 1000 + 200)
  await page.getByRole('button', { name: '停止' }).click()
  await sleep(250)

  const video = page.video()
  await page.close()
  const webm = await video.path()
  await context.close()
  await browser.close()
  console.log(`Wrote ${await muxToMov({ webm, wav: wavPath, out: outVideo, seconds: 18 })}`)
}

await record()
