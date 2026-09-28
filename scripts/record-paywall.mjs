import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, mixBow, muxToMov, sleep, writeWav } from './lib-record.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const tmp = join(root, '../.tutorial-tmp-paywall')
const desktop = join(process.env.HOME ?? '', 'Desktop')
const outVideo = join(desktop, 'Cello-Studio-付费教程-2K.mov')
const wavPath = join(tmp, 'paywall.wav')
const sampleRate = 44100

function centsToHz(hz, cents) {
  return hz * 2 ** (cents / 1200)
}

function buildAudio() {
  const samples = new Float32Array(Math.ceil(15 * sampleRate))
  mixBow(samples, 0.3, 2.5, centsToHz(65.41, -16))
  mixBow(samples, 3.0, 2.5, 65.41)
  mixBow(samples, 5.7, 2.5, centsToHz(65.41, 16))
  mixBow(samples, 8.4, 2.4, 98)
  mixBow(samples, 11.0, 3.6, 220)
  writeWav(wavPath, samples)
}

async function homeShow(page, id, cents, caption) {
  await page.evaluate(
    ({ id, cents, caption }) => {
      const api = document.querySelector('#home').contentWindow.__celloTutorial
      api.listen(true)
      api.showString(id, cents)
      api.setCaption(caption)
    },
    { id, cents, caption },
  )
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
    localStorage.setItem('cello.studio.trialStartedAt', String(Date.now() - 5 * 24 * 3600 * 1000))
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/paywall-split.html', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const home = document.querySelector('#home')?.contentWindow
    const pay = document.querySelector('#pay')?.contentWindow
    return Boolean(home?.__celloTutorial && pay?.document.querySelector('.member'))
  })

  await homeShow(page, 'C', -18, 'C 弦偏低')
  await page.evaluate(() => {
    document.getElementById('caption').textContent = '左：C 弦偏低    右：会员页一次买断'
  })
  await sleep(2800)
  await homeShow(page, 'C', 0, 'C 弦准确')
  await page.frameLocator('#pay').getByRole('button', { name: '永久', exact: true }).click()
  await page.evaluate(() => {
    document.getElementById('caption').textContent = '左：C 弦准确    右：永久解锁 ¥16'
  })
  await sleep(2800)
  await homeShow(page, 'C', 18, 'C 弦偏高')
  await page.frameLocator('#pay').getByRole('button', { name: 'VIP', exact: true }).click()
  await page.evaluate(() => {
    document.getElementById('caption').textContent = '左：C 弦偏高    右：3 天体验卡 ¥0'
  })
  await sleep(2800)
  await homeShow(page, 'A', 0, 'A 弦准确')
  await page.frameLocator('#pay').getByRole('button', { name: '永久', exact: true }).click()
  await page.frameLocator('#pay').locator('.agree input[type="checkbox"]').check()
  await page.evaluate(() => {
    document.getElementById('caption').textContent = '左：A 弦准确    右：勾选协议立即买断'
  })
  await sleep(2600)
  await page.frameLocator('#pay').getByRole('button', { name: /立即买断/ }).click()
  await page.evaluate(() => {
    document.getElementById('caption').textContent = '校对完成 · 永久解锁'
  })
  await sleep(3600)

  const video = page.video()
  await page.close()
  const webm = await video.path()
  await context.close()
  await browser.close()
  console.log(`Wrote ${await muxToMov({ webm, wav: wavPath, out: outVideo })}`)
}

await record()
