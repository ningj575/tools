import JSZip from 'jszip'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { OutputFile } from '../types'

/** 将字节数格式化为便于阅读的文件大小。 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

/** 判断当前页面是否运行在微信内置浏览器中。 */
export function isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent)
}

/** 在支持文件分享的手机浏览器中调起系统保存或分享面板。 */
async function shareFileOnMobile(blob: Blob, filename: string): Promise<boolean> {
  if (!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return false
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
    if (!navigator.canShare({ files: [file] })) return false
    await navigator.share({ files: [file], title: filename })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return false
  }
}

/** 在微信中展示可长按保存的图片，避免下载按钮只打开 Blob 链接。 */
async function showWeChatImageGuide(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  try {
    await ElMessageBox.alert(
      `<div class="wechat-save-guide"><img src="${url}" alt="待保存图片"><p>请长按上方图片，选择“保存图片”</p></div>`,
      '保存图片',
      { dangerouslyUseHTMLString: true, confirmButtonText: '关闭', customClass: 'wechat-save-dialog' },
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 创建下载任务；手机优先使用系统保存面板，并为微信提供专用保存引导。 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (await shareFileOnMobile(blob, filename)) return
  if (isWeChatBrowser()) {
    if (blob.type.startsWith('image/')) {
      await showWeChatImageGuide(blob)
    } else {
      await ElMessageBox.alert(
        '微信内置浏览器不支持直接保存此类文件。请点击右上角“…”并选择“在浏览器打开”，然后再次点击下载。',
        '请使用系统浏览器下载',
        { confirmButtonText: '我知道了' },
      )
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  ElMessage.success('已开始下载，请在浏览器下载记录中查看')
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** 使用 JSZip 在浏览器内打包结果，不将文件发送到服务器。 */
export async function downloadZip(items: OutputFile[], filename: string, onProgress?: (value: number) => void): Promise<void> {
  if (!items.length) throw new Error('没有可打包的文件')
  const zip = new JSZip()
  items.forEach((item) => zip.file(item.name, item.blob))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => onProgress?.(Math.round(meta.percent)))
  await downloadBlob(blob, filename)
}

/** 主动释放图片预览 URL，避免重复处理大文件时内存持续增长。 */
export function revokeOutputs(items: OutputFile[]): void {
  items.forEach((item) => URL.revokeObjectURL(item.url))
}

/** 同时校验浏览器报告的 MIME 和扩展名，降低伪装文件风险。 */
export function validateFiles(files: File[], kind: 'pdf' | 'image', maxBytes: number, maxCount = 100): string | null {
  if (!files.length) return '请选择文件'
  if (files.length > maxCount) return `一次最多处理 ${maxCount} 个文件`
  const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
  const imageExt = /\.(png|jpe?g|webp)$/i
  for (const file of files) {
    if (file.size <= 0) return `${file.name} 是空文件`
    if (file.size > maxBytes) return `${file.name} 超过 ${Math.round(maxBytes / 1024 / 1024)}MB 限制`
    if (kind === 'pdf' && !(file.type === 'application/pdf' && /\.pdf$/i.test(file.name))) return `${file.name} 不是有效的 PDF 类型`
    if (kind === 'image' && !(imageTypes.has(file.type) && imageExt.test(file.name))) return `${file.name} 仅支持 PNG、JPG、WEBP`
  }
  return null
}

/** 从未知异常中提取用户可理解的错误信息。 */
export function friendlyError(error: unknown, fallback = '处理失败，请检查文件是否损坏'): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/getOrInsertComputed|Promise\.withResolvers|is not a function/i.test(message)) return '当前内置浏览器版本较旧，请更新微信后重试，或使用系统浏览器打开本页面'
  if (/password|encrypted|PasswordException/i.test(message)) return 'PDF 已加密，请先移除密码后再试'
  if (/InvalidPDF|FormatError|corrupt|unexpected response/i.test(message)) return '文件已损坏或格式不受支持'
  if (/memory|allocation|canvas|dimension/i.test(message)) return '文件过大，浏览器内存不足；请减少图片数量或拆分文件后重试'
  return message && message !== '[object Object]' ? message : fallback
}
