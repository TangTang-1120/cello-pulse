import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, mixMetronome, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp-style')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-样式demo.mov')
const wavPath = join(tmp, 'style.wav')
const W = 430
const H = 860
const bpm = 72
const beat = 60 / bpm
const bar = beat * 4
const total = 23.2

function buildAudio() {
  const samples = new Float32Array(Math.ceil(total * 44100))
  mixBow(samples, 0.45, bar, 65.41)
  mixBow(samples, 0.45 + bar, bar, 98)
  mixMetronome(samples, 0.45 + bar * 2 + 0.4, 8, bpm)
  const pos = 0.45 + bar * 2 + 0.4 + 8 * beat + 0.45
  mixBow(samples, pos, 2.05, 65.41)
  mixBow(samples, pos + 2.1, 2.05, 73.42)
  mixBow(samples, pos + 4.2, 2.05, 98)
  mixBow(samples, pos + 6.3, 2.2, 220)
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
  await page.evaluate(() => window.__celloTutorial.showString('C', 0))
  await sleep(bar * 1000)
  await page.evaluate(() => window.__celloTutorial.showString('G', 0))
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
  console.log(`Wrote ${await muxToMov({ webm, wav: wavPath, out: outVideo, seconds: 23 })}`)
}

await record()
