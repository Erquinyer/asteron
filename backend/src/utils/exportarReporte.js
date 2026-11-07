import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

// Los dos formatos reciben lo mismo: { titulo, periodo, secciones, archivo }, donde
// cada sección es { titulo, columnas: [{ clave, titulo, ancho }], filas }.

const texto = (valor) => (valor === null || valor === undefined || valor === '' ? '—' : String(valor))

export const enviarExcel = async (res, { titulo, periodo, secciones, archivo }) => {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Asteron · Macromet S.A.S.'
  for (const seccion of secciones) {
    const hoja = libro.addWorksheet(seccion.titulo)
    hoja.addRow([titulo]).font = { bold: true, size: 14 }
    hoja.addRow([`${seccion.titulo} · ${periodo}`]).font = { color: { argb: 'FF666666' } }
    hoja.addRow([])
    const encabezado = hoja.addRow(seccion.columnas.map(c => c.titulo))
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    encabezado.eachCell(celda => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    })
    seccion.columnas.forEach((c, i) => { hoja.getColumn(i + 1).width = c.ancho })
    for (const fila of seccion.filas) {
      hoja.addRow(seccion.columnas.map(c => fila[c.clave] ?? ''))
    }
    hoja.views = [{ state: 'frozen', ySplit: 4 }]
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}.xlsx"`)
  await libro.xlsx.write(res)
  res.end()
}

const MARGEN = 36
const ALTO_MIN_FILA = 18

export const enviarPdf = (res, { titulo, periodo, secciones, archivo }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGEN, bufferPages: true })
  doc.on('error', reject)
  res.on('finish', resolve)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}.pdf"`)
  doc.pipe(res)

  const anchoUtil = doc.page.width - MARGEN * 2
  const limiteInferior = () => doc.page.height - MARGEN - 16

  doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827').text(titulo)
  doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(`Macromet S.A.S. · ${periodo}`)
  doc.moveDown(1)

  for (const seccion of secciones) {
    const totalAnchos = seccion.columnas.reduce((s, c) => s + c.ancho, 0)
    const anchos = seccion.columnas.map(c => (c.ancho / totalAnchos) * anchoUtil)

    const dibujarFila = (celdas, { encabezado }) => {
      doc.font(encabezado ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
      const alto = Math.max(ALTO_MIN_FILA, ...celdas.map((t, i) => doc.heightOfString(t, { width: anchos[i] - 8 }) + 8))
      if (doc.y + alto > limiteInferior()) doc.addPage()
      const y = doc.y
      if (encabezado) doc.rect(MARGEN, y, anchoUtil, alto).fill('#1F2937')
      let x = MARGEN
      celdas.forEach((t, i) => {
        doc.fillColor(encabezado ? '#FFFFFF' : '#111827')
          .text(t, x + 4, y + 4, { width: anchos[i] - 8, lineBreak: true })
        x += anchos[i]
      })
      doc.moveTo(MARGEN, y + alto).lineTo(MARGEN + anchoUtil, y + alto).lineWidth(0.5).strokeColor('#E5E7EB').stroke()
      doc.x = MARGEN
      doc.y = y + alto
    }

    if (doc.y + 60 > limiteInferior()) doc.addPage()
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(seccion.titulo, MARGEN, doc.y)
    doc.moveDown(0.4)
    if (seccion.filas.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text('Sin datos para los filtros seleccionados.')
    } else {
      const encabezados = seccion.columnas.map(c => c.titulo)
      dibujarFila(encabezados, { encabezado: true })
      for (const fila of seccion.filas) {
        dibujarFila(seccion.columnas.map(c => texto(fila[c.clave])), { encabezado: false })
      }
    }
    doc.moveDown(1.2)
  }

  const paginas = doc.bufferedPageRange()
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i)
    doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF').text(
      `Asteron · Página ${i + 1} de ${paginas.count}`,
      MARGEN, doc.page.height - MARGEN - 10, { width: anchoUtil, align: 'right', lineBreak: false })
  }
  doc.end()
})
