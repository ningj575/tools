import { ZipArchive, type ArchiverError } from 'archiver'
import express, { type NextFunction, type Request, type Response } from 'express'
import { createReadStream } from 'node:fs'
import { mkdtemp, open, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { config } from './config.js'
import { renderPdf, type ServerImageFormat } from './pdf-renderer.js'

const app = express()
const uploadRoot = join(tmpdir(), 'lightpage-uploads')
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadRoot,
    filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 4 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname)),
})

app.disable('x-powered-by')
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_request, response) => response.json({ ok: true }))

/** 检查 PDF 魔数，防止仅修改扩展名和 MIME 的伪装文件。 */
async function assertPdfSignature(path: string): Promise<void> {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(5)
    await handle.read(buffer, 0, 5, 0)
    if (buffer.toString('ascii') !== '%PDF-') throw new Error('文件内容不是有效的 PDF')
  } finally {
    await handle.close()
  }
}

app.post('/api/pdf/render', upload.single('file'), async (request: Request, response: Response, next: NextFunction) => {
  if (!request.file) return response.status(400).json({ message: '请选择有效的 PDF 文件' })
  let workDirectory: string | undefined
  const uploadedPath = request.file.path
  try {
    await assertPdfSignature(uploadedPath)
    const format = request.body.format as ServerImageFormat
    if (!['png', 'jpeg', 'webp'].includes(format)) return response.status(400).json({ message: '不支持的输出格式' })
    const quality = Number.parseInt(request.body.quality, 10)
    const dpi = Number.parseInt(request.body.dpi, 10)
    if (!Number.isInteger(quality) || quality < 20 || quality > 100) return response.status(400).json({ message: '质量参数必须在 20–100 之间' })
    if (!Number.isInteger(dpi) || dpi < 72 || dpi > 216) return response.status(400).json({ message: 'DPI 参数必须在 72–216 之间' })

    workDirectory = await mkdtemp(join(tmpdir(), 'lightpage-job-'))
    const pdfPath = join(workDirectory, 'input.pdf')
    await rename(uploadedPath, pdfPath)
    const pages = await renderPdf(pdfPath, workDirectory, format, quality, dpi)
    const safeBase = request.file.originalname.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'pdf'
    response.attachment(`${safeBase}-images.zip`)
    response.type('application/zip')
    const archive = new ZipArchive({ zlib: { level: 6 } })
    archive.on('warning', (error: ArchiverError) => { if (error.code !== 'ENOENT') response.destroy(error) })
    archive.on('error', (error: Error) => response.destroy(error))
    archive.pipe(response)
    pages.forEach((path) => archive.append(createReadStream(path), { name: basename(path) }))
    await archive.finalize()
  } catch (error) {
    next(error)
  } finally {
    const cleanup = async () => {
      await rm(uploadedPath, { force: true }).catch(() => undefined)
      if (workDirectory) await rm(workDirectory, { recursive: true, force: true }).catch(() => undefined)
    }
    if (response.headersSent && !response.writableFinished) response.once('close', cleanup)
    else await cleanup()
  }
})

const clientDist = resolve(import.meta.dirname, '../../client/dist')
app.use(express.static(clientDist, { maxAge: '1d', index: false }))
app.get('/{*splat}', (_request, response) => response.sendFile(join(clientDist, 'index.html')))

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error)
  if (response.headersSent) return response.end()
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ message: `文件超过 ${config.maxUploadMb}MB 限制` })
  const message = error instanceof Error ? error.message : '服务器处理失败'
  response.status(/不是有效|不支持|参数|加密/.test(message) ? 400 : 500).json({ message })
})

app.listen(config.port, '0.0.0.0', () => console.log(`Xinglu Tools server listening on http://localhost:${config.port}`))
