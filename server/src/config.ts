/** 将环境变量解析为受边界约束的整数，防止错误配置绕过限制。 */
function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export const config = {
  port: boundedInteger(process.env.PORT, 3000, 1, 65535),
  maxUploadMb: boundedInteger(process.env.MAX_UPLOAD_MB, 250, 10, 500),
  ghostscriptBin: process.env.GS_BIN || 'gs',
  renderTimeoutMs: boundedInteger(process.env.RENDER_TIMEOUT_MS, 5 * 60 * 1000, 30_000, 15 * 60 * 1000),
}
