export type ImageFormat = 'png' | 'jpeg' | 'webp'
export type StitchMode = 'horizontal' | 'vertical' | 'grid'

export interface OutputFile {
  name: string
  blob: Blob
  url: string
  width?: number
  height?: number
}

export interface PdfRenderOptions {
  format: ImageFormat
  quality: number
  scale: number
  onProgress?: (percent: number) => void
}

export interface PdfPageOptions {
  size: 'a4' | 'letter' | 'fit'
  orientation: 'portrait' | 'landscape'
  margin: number
}

export interface StitchOptions {
  mode: StitchMode
  gap: number
  margin: number
  columns: number
  background: string
  format: ImageFormat
  quality: number
}
