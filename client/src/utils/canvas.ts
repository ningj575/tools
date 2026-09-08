import { MIME_BY_FORMAT } from '../constants'
import type { ImageFormat, StitchOptions } from '../types'

/** 安全解码浏览器支持的图片文件，并负责释放临时 URL。 */
export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片尺寸无效')
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 将 Canvas 异步编码为 Blob，避免 data URL 带来的额外内存占用。 */
export function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('浏览器无法编码该图片格式')), MIME_BY_FORMAT[format], quality)
  })
}

/** 将图片转换为指定格式并可按最长边等比缩放。 */
export async function convertImage(file: File, format: ImageFormat, quality: number, maxDimension?: number): Promise<Blob> {
  const image = await loadImage(file)
  const ratio = maxDimension && Math.max(image.naturalWidth, image.naturalHeight) > maxDimension
    ? maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
    : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建图片画布')
  if (format === 'jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas, format, quality)
}

/** 使用原生 Canvas 按横向、纵向或网格布局拼接图片。 */
export async function stitchImages(files: File[], options: StitchOptions): Promise<Blob> {
  const images = await Promise.all(files.map(loadImage))
  const gap = Math.max(0, options.gap)
  const margin = Math.max(0, options.margin)
  let width = 0
  let height = 0
  let positions: Array<{ image: HTMLImageElement; x: number; y: number }> = []

  if (options.mode === 'horizontal') {
    height = Math.max(...images.map((item) => item.naturalHeight))
    width = images.reduce((sum, item) => sum + item.naturalWidth, 0) + gap * (images.length - 1)
    let x = 0
    positions = images.map((image) => { const current = { image, x, y: Math.round((height - image.naturalHeight) / 2) }; x += image.naturalWidth + gap; return current })
  } else if (options.mode === 'vertical') {
    width = Math.max(...images.map((item) => item.naturalWidth))
    height = images.reduce((sum, item) => sum + item.naturalHeight, 0) + gap * (images.length - 1)
    let y = 0
    positions = images.map((image) => { const current = { image, x: Math.round((width - image.naturalWidth) / 2), y }; y += image.naturalHeight + gap; return current })
  } else {
    const columns = Math.max(1, Math.min(options.columns, images.length))
    const rows = Math.ceil(images.length / columns)
    const cellWidth = Math.max(...images.map((item) => item.naturalWidth))
    const cellHeight = Math.max(...images.map((item) => item.naturalHeight))
    width = cellWidth * columns + gap * (columns - 1)
    height = cellHeight * rows + gap * (rows - 1)
    positions = images.map((image, index) => ({
      image,
      x: (index % columns) * (cellWidth + gap) + Math.round((cellWidth - image.naturalWidth) / 2),
      y: Math.floor(index / columns) * (cellHeight + gap) + Math.round((cellHeight - image.naturalHeight) / 2),
    }))
  }

  width += margin * 2
  height += margin * 2
  positions = positions.map(({ image, x, y }) => ({ image, x: x + margin, y: y + margin }))

  if (width * height > 120_000_000 || width > 32767 || height > 32767) throw new Error('canvas dimension 超出浏览器安全范围，请减少图片或先缩小尺寸')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建拼接画布')
  context.fillStyle = options.background
  context.fillRect(0, 0, width, height)
  positions.forEach(({ image, x, y }) => context.drawImage(image, x, y))
  return canvasToBlob(canvas, options.format, options.quality)
}
