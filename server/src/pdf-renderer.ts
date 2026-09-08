import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { config } from './config.js'

export type ServerImageFormat = 'png' | 'jpeg' | 'webp'

/** 运行 Ghostscript 并限制执行时间；参数以数组传入，避免 shell 注入。 */
function runGhostscript(inputPath: string, outputPattern: string, dpi: number): Promise<void> {
  const args = [
    '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET',
    '-sDEVICE=png16m', `-r${dpi}`,
    `-sOutputFile=${outputPattern}`,
    inputPath,
  ]
  return new Promise((resolve, reject) => {
    const process = spawn(config.ghostscriptBin, args, { shell: false, windowsHide: true })
    let stderr = ''
    const timer = setTimeout(() => {
      process.kill('SIGKILL')
      reject(new Error('PDF 处理超时，请降低 DPI 或拆分文件'))
    }, config.renderTimeoutMs)
    process.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-4000) })
    process.on('error', (error) => { clearTimeout(timer); reject(new Error(`Ghostscript 无法启动：${error.message}`)) })
    process.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else if (/password|encrypted/i.test(stderr)) reject(new Error('PDF 已加密，请先移除密码'))
      else reject(new Error(`PDF 渲染失败${stderr ? `：${stderr.trim()}` : ''}`))
    })
  })
}

/** 使用 Ghostscript 渲染 PDF，并由 Sharp 安全转码到目标格式。 */
export async function renderPdf(inputPath: string, workDirectory: string, format: ServerImageFormat, quality: number, dpi: number): Promise<string[]> {
  const rawPattern = join(workDirectory, 'raw-%04d.png')
  await runGhostscript(inputPath, rawPattern, dpi)
  const rawPages = (await readdir(workDirectory)).filter((name) => /^raw-\d{4}\.png$/.test(name)).sort()
  if (!rawPages.length) throw new Error('PDF 没有可导出的页面')
  const extension = format === 'jpeg' ? 'jpg' : format
  const outputs: string[] = []
  for (let index = 0; index < rawPages.length; index += 1) {
    const outputPath = join(workDirectory, `page-${String(index + 1).padStart(4, '0')}.${extension}`)
    const pipeline = sharp(join(workDirectory, rawPages[index]), { limitInputPixels: 120_000_000, sequentialRead: true }).rotate()
    if (format === 'jpeg') await pipeline.jpeg({ quality, mozjpeg: true }).toFile(outputPath)
    else if (format === 'webp') await pipeline.webp({ quality }).toFile(outputPath)
    else await pipeline.png({ compressionLevel: 8 }).toFile(outputPath)
    outputs.push(outputPath)
  }
  return outputs
}
