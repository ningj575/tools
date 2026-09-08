import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { MIME_BY_FORMAT } from '../constants'
import type { PdfPageOptions, PdfRenderOptions, OutputFile } from '../types'
import { canvasToBlob, loadImage } from './canvas'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href

const LONG_IMAGE_MAX_PIXELS = 16_000_000
const LONG_IMAGE_MAX_HEIGHT = 30_000

/** 将逐页渲染结果按相同宽度纵向合成长图，并限制手机浏览器的画布内存。 */
async function mergePdfPagesToLongImage(file: File, pages: OutputFile[], options: PdfRenderOptions): Promise<OutputFile> {
  if (!pages.length) throw new Error('PDF 没有可合并的页面')
  const sourceWidth = Math.max(...pages.map((page) => page.width ?? 1))
  const sourceHeight = pages.reduce((sum, page) => sum + (page.height ?? 1) * sourceWidth / (page.width ?? 1), 0)
  const safeScale = Math.min(1, LONG_IMAGE_MAX_HEIGHT / sourceHeight, Math.sqrt(LONG_IMAGE_MAX_PIXELS / (sourceWidth * sourceHeight)))
  const width = Math.max(1, Math.floor(sourceWidth * safeScale))
  const heights = pages.map((page) => Math.max(1, Math.round((page.height ?? 1) * width / (page.width ?? 1))))
  const height = heights.reduce((sum, item) => sum + item, 0)
  if (width < 320 || height > LONG_IMAGE_MAX_HEIGHT) throw new Error('PDF 页数过多，合成长图后清晰度过低，请选择一页一图')

  const canvas = window.document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: options.format !== 'jpeg' })
  if (!context) throw new Error('无法创建 PDF 长图画布')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  let y = 0
  for (let index = 0; index < pages.length; index += 1) {
    const image = await loadImage(pages[index].blob)
    context.drawImage(image, 0, y, width, heights[index])
    y += heights[index]
    options.onProgress?.(90 + Math.round(((index + 1) / pages.length) * 10))
  }
  const blob = await canvasToBlob(canvas, options.format, options.quality)
  canvas.width = 1
  canvas.height = 1
  const extension = options.format === 'jpeg' ? 'jpg' : options.format
  const baseName = file.name.replace(/\.pdf$/i, '') || 'pdf'
  return { name: `${baseName}-long.${extension}`, blob, url: URL.createObjectURL(blob), width, height }
}

/** 逐页渲染 PDF，限制并发以降低长文档的峰值内存。 */
export async function renderPdfToImages(file: File, options: PdfRenderOptions): Promise<OutputFile[]> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const task = pdfjsLib.getDocument({ data: bytes })
  const document = await task.promise
  const outputs: OutputFile[] = []
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: options.scale })
      if (viewport.width * viewport.height > 80_000_000) throw new Error('canvas dimension 过大，请降低输出倍率')
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const context = canvas.getContext('2d', { alpha: options.format !== 'jpeg' })
      if (!context) throw new Error('无法创建 PDF 渲染画布')
      if (options.format === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      await page.render({ canvas, canvasContext: context, viewport }).promise
      const blob = await canvasToBlob(canvas, options.format, options.quality)
      const extension = options.format === 'jpeg' ? 'jpg' : options.format
      outputs.push({ name: `page-${String(pageNumber).padStart(3, '0')}.${extension}`, blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height })
      canvas.width = 1
      canvas.height = 1
      page.cleanup()
      const renderShare = options.layout === 'long' ? 90 : 100
      options.onProgress?.(Math.round((pageNumber / document.numPages) * renderShare))
    }
    if (options.layout === 'long') {
      const longImage = await mergePdfPagesToLongImage(file, outputs, options)
      outputs.forEach((item) => URL.revokeObjectURL(item.url))
      return [longImage]
    }
    return outputs
  } catch (error) {
    outputs.forEach((item) => URL.revokeObjectURL(item.url))
    throw error
  } finally {
    await task.destroy()
  }
}

/** 把多张图片嵌入 PDF；页面可适配 A4、Letter 或原图尺寸并保留边距。 */
export async function imagesToPdf(files: File[], options: PdfPageOptions, onProgress?: (value: number) => void): Promise<Blob> {
  const pdf = await PDFDocument.create()
  const standard = options.size === 'a4' ? [595.28, 841.89] : [612, 792]
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const bytes = await file.arrayBuffer()
    let embedded
    if (file.type === 'image/png') embedded = await pdf.embedPng(bytes)
    else if (file.type === 'image/jpeg') embedded = await pdf.embedJpg(bytes)
    else {
      const image = await loadImage(file)
      const canvas = window.document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d')?.drawImage(image, 0, 0)
      embedded = await pdf.embedPng(await (await canvasToBlob(canvas, 'png')).arrayBuffer())
    }
    let pageWidth = options.size === 'fit' ? embedded.width + options.margin * 2 : standard[0]
    let pageHeight = options.size === 'fit' ? embedded.height + options.margin * 2 : standard[1]
    if (options.orientation === 'landscape') [pageWidth, pageHeight] = [Math.max(pageWidth, pageHeight), Math.min(pageWidth, pageHeight)]
    const availableWidth = Math.max(1, pageWidth - options.margin * 2)
    const availableHeight = Math.max(1, pageHeight - options.margin * 2)
    const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height, 1)
    const width = embedded.width * scale
    const height = embedded.height * scale
    const page = pdf.addPage([pageWidth, pageHeight])
    page.drawImage(embedded, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height })
    onProgress?.(Math.round(((index + 1) / files.length) * 100))
  }
  const saved = await pdf.save()
  const buffer = new ArrayBuffer(saved.byteLength)
  new Uint8Array(buffer).set(saved)
  return new Blob([buffer], { type: 'application/pdf' })
}

/** 上传 PDF 到明确启用的后端兜底端点，并返回服务端生成的 ZIP。 */
export async function renderPdfOnServer(file: File, options: PdfRenderOptions): Promise<Blob> {
  const body = new FormData()
  body.append('file', file)
  body.append('format', options.format)
  body.append('quality', String(Math.round(options.quality * 100)))
  body.append('dpi', String(Math.round(72 * options.scale)))
  const response = await fetch('/api/pdf/render', { method: 'POST', body })
  if (!response.ok) {
    const result = await response.json().catch(() => ({ message: '后端处理失败' }))
    throw new Error(result.message ?? '后端处理失败')
  }
  return response.blob()
}

export { MIME_BY_FORMAT }
