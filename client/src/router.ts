import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/pdf-to-images' },
    { path: '/pdf-to-images', component: () => import('./views/PdfToImagesView.vue'), meta: { title: '免费 PDF 转图片 - 在线导出 JPG/PNG/WebP | 星路工具箱', description: '免费在线将 PDF 每一页转换为 JPG、PNG 或 WebP 图片，支持单张下载与 ZIP 批量下载，默认浏览器本地安全处理。', keywords: '免费PDF转图片,PDF转JPG,PDF转PNG,PDF转WebP,在线PDF转换' } },
    { path: '/images-to-pdf', component: () => import('./views/ImagesToPdfView.vue'), meta: { title: '免费图片转 PDF - 多图合并 PDF | 星路工具箱', description: '免费在线将多张 JPG、PNG、WebP 图片合并为 PDF，可设置 A4、Letter、页面方向和页边距，文件本地处理。', keywords: '免费图片转PDF,JPG转PDF,PNG转PDF,多图合并PDF,在线图片转PDF' } },
    { path: '/stitch', component: () => import('./views/ImageStitchView.vue'), meta: { title: '免费图片拼接 - 横向纵向网格长图 | 星路工具箱', description: '免费在线拼接多张图片，支持横向、纵向和网格布局，可设置图片间隙、页边距、背景色与输出格式。', keywords: '免费图片拼接,长图拼接,横向拼图,纵向拼图,网格拼图' } },
    { path: '/compress', component: () => import('./views/ImageCompressView.vue'), meta: { title: '免费图片压缩 - JPG/PNG/WebP 在线压缩 | 星路工具箱', description: '免费在线压缩 JPG、PNG、WebP 图片，自定义图片质量并批量处理下载，保持原始图片尺寸且不会上传服务器。', keywords: '免费图片压缩,JPG压缩,PNG压缩,WebP压缩,在线压缩图片' } },
    { path: '/convert', component: () => import('./views/FormatConvertView.vue'), meta: { title: '免费图片格式转换 - PNG/JPG/WebP 互转 | 星路工具箱', description: '免费在线进行 PNG、JPG、WebP 图片格式批量互转，可调输出质量，所有转换默认在本地浏览器完成。', keywords: '免费图片格式转换,PNG转JPG,JPG转WebP,WebP转PNG,在线图片转换' } },
    { path: '/:pathMatch(.*)*', redirect: '/pdf-to-images' },
  ],
})

/** 创建或更新指定属性的页面 Meta 标签。 */
function updateMeta(selector: string, attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

/** 写入当前免费工具页面的 WebApplication 结构化数据。 */
function updateStructuredData(title: string, description: string): void {
  let script = document.head.querySelector<HTMLScriptElement>('#route-structured-data')
  if (!script) {
    script = document.createElement('script')
    script.id = 'route-structured-data'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title.split('|')[0].trim(),
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  })
}

router.afterEach((to) => {
  const title = String(to.meta.title ?? '星路工具箱 - 免费在线 PDF 与图片处理工具')
  const description = String(to.meta.description ?? '免费在线处理 PDF 与图片，文件默认在浏览器本地安全处理。')
  const keywords = String(to.meta.keywords ?? '免费PDF工具,免费图片工具,在线工具')
  document.title = title
  updateMeta('meta[name="description"]', 'name', 'description', description)
  updateMeta('meta[name="keywords"]', 'name', 'keywords', keywords)
  updateMeta('meta[property="og:title"]', 'property', 'og:title', title)
  updateMeta('meta[property="og:description"]', 'property', 'og:description', description)
  updateStructuredData(title, description)
})

export default router
