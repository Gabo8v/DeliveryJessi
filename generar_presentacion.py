from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate
import os

W, H = A4

BG = HexColor('#FDF3E7')
ORANGE = HexColor('#E8895F')
ORANGE_DARK = HexColor('#D47850')
SAGE = HexColor('#7A9E7F')
SAGE_DARK = HexColor('#6A8E6F')
BROWN = HexColor('#3D2C2E')
MUTED = HexColor('#8C7A7B')
WARM_TAN = HexColor('#C4A484')
WHITE = HexColor('#FFFFFF')
LIGHT_ORANGE = HexColor('#FFF0E0')

OUTPUT = 'Presentacion_Comida_Mecha.pdf'
LOGO = 'Logo.jpg'

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'Titulo', fontSize=28, textColor=BROWN, fontName='Helvetica-Bold',
    alignment=TA_CENTER, spaceAfter=6
)
subtitle_style = ParagraphStyle(
    'Subtitulo', fontSize=16, textColor=MUTED, fontName='Helvetica',
    alignment=TA_CENTER, spaceAfter=4
)
h1 = ParagraphStyle(
    'H1', fontSize=22, textColor=ORANGE_DARK, fontName='Helvetica-Bold',
    spaceBefore=20, spaceAfter=12, borderWidth=0, borderPadding=0
)
h2 = ParagraphStyle(
    'H2', fontSize=16, textColor=BROWN, fontName='Helvetica-Bold',
    spaceBefore=16, spaceAfter=8
)
h3 = ParagraphStyle(
    'H3', fontSize=13, textColor=SAGE_DARK, fontName='Helvetica-Bold',
    spaceBefore=12, spaceAfter=6
)
body = ParagraphStyle(
    'Body', fontSize=11, textColor=BROWN, fontName='Helvetica',
    alignment=TA_JUSTIFY, spaceAfter=8, leading=15
)
body_bold = ParagraphStyle(
    'BodyBold', fontSize=11, textColor=BROWN, fontName='Helvetica-Bold',
    spaceAfter=4, leading=15
)
bullet = ParagraphStyle(
    'Bullet', fontSize=11, textColor=BROWN, fontName='Helvetica',
    spaceAfter=4, leading=14, leftIndent=20, bulletIndent=10
)
caption = ParagraphStyle(
    'Caption', fontSize=10, textColor=MUTED, fontName='Helvetica-Oblique',
    alignment=TA_CENTER, spaceBefore=4, spaceAfter=12
)

def hr():
    return HRFlowable(width='100%', thickness=1, color=HexColor('#E0D5C7'),
                       spaceBefore=8, spaceAfter=8)

def build_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.restoreState()

def first_page(canvas, doc):
    build_page(canvas, doc)

def later_pages(canvas, doc):
    build_page(canvas, doc)
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(2*cm, 1*cm, f'Comida Mecha - Manual de Usuario')
    canvas.drawRightString(W - 2*cm, 1*cm, f'Página {doc.page}')
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm
)

story = []

# ─── PORTADA ───
story.append(Spacer(1, 3*cm))
logo = Image(LOGO, width=4*cm, height=4*cm)
story.append(logo)
story.append(Spacer(1, 0.8*cm))
story.append(Paragraph('Comida Mecha', title_style))
story.append(Paragraph('Sistema de Gestión para Viandas Caseras', subtitle_style))
story.append(Spacer(1, 1*cm))

# Orange line
story.append(HRFlowable(width='40%', thickness=3, color=ORANGE,
                         spaceBefore=4, spaceAfter=4))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('Presentación y Manual de Usuario', subtitle_style))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph('Versión 1.3.0', ParagraphStyle(
    'Version', fontSize=12, textColor=SAGE, fontName='Helvetica',
    alignment=TA_CENTER
)))
story.append(PageBreak())

# ─── ÍNDICE ───
story.append(Paragraph('Índice', h1))
story.append(hr())
index_items = [
    '1. Presentación',
    '2. Primeros pasos',
    '   2.1  Pantalla principal',
    '   2.2  Cargar el menú del día',
    '3. Gestión de pedidos',
    '   3.1  Nuevo pedido',
    '   3.2  Historial de pedidos',
    '4. Gestión de clientes',
    '   4.1  Agregar cliente',
    '   4.2  Cobrar deuda',
    '5. Reportes',
    '6. Ajustes',
    '   6.1  Editar platos',
    '   6.2  Menú del día',
    '   6.3  Precios',
    '   6.4  Actualizaciones',
]
for item in index_items:
    indent = 30 if item.startswith('   ') else 10
    story.append(Paragraph(item.strip(), ParagraphStyle(
        'Index', fontSize=11, textColor=BROWN, fontName='Helvetica',
        leftIndent=indent, spaceAfter=3
    )))
story.append(PageBreak())

# ─── 1. PRESENTACIÓN ───
story.append(Paragraph('1. Presentación', h1))
story.append(hr())
story.append(Paragraph(
    'Comida Mecha es una aplicación pensada para emprendimientos de comidas caseras. '
    'Nació de la necesidad de organizar los pedidos del día a día de forma simple, '
    'rápida y sin depender de conexión a internet.',
    body
))
story.append(Paragraph(
    'Con Comida Mecha podés definir un menú diario de hasta cinco platos, tomar pedidos '
    'con todo lujo de detalles (tipo de entrega, método de pago, promociones), '
    'llevar el control de clientes fiados, registrar pagos, ver reportes diarios, '
    'semanales y mensuales, y hasta exportar los datos a Excel.',
    body
))
story.append(Spacer(1, 0.5*cm))

info_data = [
    ['Desarrollado para', 'Leonor y su emprendimiento de viandas'],
    ['Plataforma', 'Web (PWA) y Android'],
    ['Almacenamiento', 'Local (offline, no requiere internet)'],
    ['Versión actual', '1.3.0'],
]
info_table = Table(info_data, colWidths=[5*cm, 9*cm])
info_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), LIGHT_ORANGE),
    ('TEXTCOLOR', (0, 0), (-1, -1), BROWN),
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E0D5C7')),
]))
story.append(info_table)
story.append(Spacer(1, 0.5*cm))

story.append(Paragraph(
    'La aplicación está diseñada para ser intuitiva: los botones principales están '
    'siempre visibles en la parte inferior de la pantalla, y cada acción importante '
    'tiene una confirmación para evitar errores.',
    body
))
story.append(PageBreak())

# ─── 2. PRIMEROS PASOS ───
story.append(Paragraph('2. Primeros pasos', h1))
story.append(hr())

story.append(Paragraph('2.1 Pantalla principal', h2))
story.append(Paragraph(
    'Al abrir la aplicación te encontrás con la pantalla de inicio. '
    'Allí te saluda Leonor (o el nombre que hayas configurado) y ves la fecha actual. '
    'Si ya cargaste el menú del día, los platos aparecen como tarjetas; '
    'tocando cualquiera de ellos vas directo a armar un pedido con ese plato preseleccionado.',
    body
))
story.append(Paragraph(
    'En la parte inferior tenés cinco botones de navegación que te llevan a '
    'las secciones principales:',
    body
))

nav_items = [
    '<b>🏠 Inicio</b> — Pantalla principal con el menú del día',
    '<b>📋 Nuevo pedido</b> — Para tomar un pedido nuevo',
    '<b>📅 Pedidos</b> — Historial de pedidos por día',
    '<b>👥 Clientes</b> — Lista de clientes y control de deudas',
    '<b>⚙️ Ajustes</b> — Configuración de platos, precios y más',
]
for item in nav_items:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph('2.2 Cargar el menú del día', h2))
story.append(Paragraph(
    'Antes de tomar pedidos, tenés que definir qué platos se preparan hoy. '
    'En la pantalla de inicio toca el botón "Cargar menú". '
    'Se abre una ventana donde podés buscar entre todos los platos disponibles '
    'y seleccionar hasta cinco. Cada plato seleccionado aparece como una etiqueta '
    'que podés sacar tocando la "x". Cuando termines, toca "Guardar".',
    body
))
story.append(Paragraph(
    'Si querés cambiar el menú durante el día, volvé a tocar "Cargar menú" '
    'y ajustá los platos. Los pedidos ya registrados no se modifican.',
    body
))
story.append(PageBreak())

# ─── 3. GESTIÓN DE PEDIDOS ───
story.append(Paragraph('3. Gestión de pedidos', h1))
story.append(hr())

story.append(Paragraph('3.1 Nuevo pedido', h2))
story.append(Paragraph(
    'En la sección "Nuevo pedido" vas a armar cada pedido paso a paso:',
    body
))

steps = [
    '<b>Operador:</b> escribí quién toma el pedido (por defecto aparece "Leonor").',
    '<b>Platos:</b> se muestran los platos del menú de hoy. Cada uno tiene un botón '
    '"Agregar" y control de cantidad. Si un plato tiene promoción (ej. 2 por $5000), '
    'aparece un botón especial.',
    '<b>Cliente:</b> escribí el nombre para buscar entre los clientes registrados. '
    'Si no existe, se habilita un formulario para crearlo al instante.',
    '<b>Entrega:</b> elegí "Retira" (pasa a buscar) o "A domicilio" (con costo de envío).',
    '<b>Pago:</b> elegí entre Efectivo, Transferencia/Mercado Pago, o Fiado. '
    'Si el cliente es fiado, aparece un aviso.',
    '<b>Estado:</b> podés marcarlo como "Pagado" directo (salvo que sea fiado, '
    'que queda pendiente).',
    'Tocá "Guardar pedido" y se almacena automáticamente.',
]
for s in steps:
    story.append(Paragraph(s, bullet, bulletText='•'))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(
    '<b>💡 Consejo:</b> Si un cliente no aparece en la búsqueda, no hace falta '
    'salir de la pantalla. Escribí su nombre, tocá "Crear cliente" y completá '
    'los datos. Todo en el mismo lugar.',
    body
))

story.append(Paragraph('3.2 Historial de pedidos', h2))
story.append(Paragraph(
    'En "Pedidos" podés navegar entre días con las flechas ‹ y ›. '
    'Se ven las viandas totales, lo cobrado y lo pendiente. '
    'Cada pedido muestra el cliente, los platos, el medio de pago, el tipo de entrega '
    'y el operador.',
    body
))
story.append(Paragraph(
    'Desde acá podés marcar un pedido como "Pagado" cuando el cliente abona, '
    'o "Anular" si se cancela. Si el pedido era fiado, al pagarlo se descuenta '
    'automáticamente de la deuda del cliente.',
    body
))
story.append(PageBreak())

# ─── 4. GESTIÓN DE CLIENTES ───
story.append(Paragraph('4. Gestión de clientes', h1))
story.append(hr())

story.append(Paragraph('4.1 Agregar cliente', h2))
story.append(Paragraph(
    'En la pantalla "Clientes" podés ver todos los clientes registrados. '
    'Usá el buscador para filtrar por nombre o teléfono. '
    'Cada tarjeta muestra el nombre, teléfono y un indicador de deuda: '
    'rojo si debe plata, verde si está al día.',
    body
))
story.append(Paragraph(
    'Tocá el botón "+" para agregar un cliente nuevo. '
    'Se abre una ventana con los campos: nombre completo, teléfono, dirección '
    'y un indicador para marcar si es cliente fiado.',
    body
))

story.append(Paragraph('4.2 Cobrar deuda', h2))
story.append(Paragraph(
    'Tocando un cliente existente se abre un detalle con su información '
    'y el historial de los últimos pedidos. Si tiene deuda, acá podés '
    'registrar un pago: ingresá el monto y la fecha, y la deuda se actualiza sola. '
    'También podés ver todos los pagos registrados.',
    body
))
story.append(PageBreak())

# ─── 5. REPORTES ───
story.append(Paragraph('5. Reportes', h1))
story.append(hr())
story.append(Paragraph(
    'La sección "Reportes" te da una vista general del negocio. '
    'Podés elegir entre tres períodos:',
    body
))

report_items = [
    '<b>Día:</b> muestra las estadísticas del día de hoy.',
    '<b>Semana:</b> resume los últimos siete días con un gráfico de barras '
    'que muestra la recaudación de cada día.',
    '<b>Mes:</b> estadísticas del mes actual.',
]
for item in report_items:
    story.append(Paragraph(item, bullet, bulletText='•'))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(
    'En cada período ves: total de viandas vendidas, dinero total, plato más vendido, '
    'operador que más pedidos tomó y deuda total fiada. '
    'También hay una pestaña "Cierres" con el historial de cierres de turno.',
    body
))
story.append(Paragraph(
    '<b>Compartir:</b> tocá el botón de compartir para copiar un resumen en texto '
    'y mandarlo por WhatsApp o donde quieras.',
    body
))
story.append(Paragraph(
    '<b>Descargar Excel:</b> exportá los datos a un archivo de Excel '
    'para llevar tu propia contabilidad.',
    body
))
story.append(PageBreak())

# ─── 6. AJUSTES ───
story.append(Paragraph('6. Ajustes', h1))
story.append(hr())

story.append(Paragraph('6.1 Editar platos', h2))
story.append(Paragraph(
    'En "Ajustes" → "Editar Platos" ves la lista completa de platos '
    '(activos e inactivos). Tocando un plato se abre un formulario para modificar:',
    body
))
plate_items = [
    'Nombre del plato',
    'Precio base',
    'Sopa (precio adicional si aplica)',
    'Promociones (ej. "2x5000", "3x7000")',
]
for item in plate_items:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph(
    'También podés activar o desactivar un plato con un interruptor. '
    'Los platos inactivos no aparecen en el menú del día.',
    body
))

story.append(Paragraph('6.2 Menú del día', h2))
story.append(Paragraph(
    'También desde "Ajustes" podés cargar el menú para cualquier fecha, '
    'no solo la de hoy. Útil si querés planificar con anticipación.',
    body
))

story.append(Paragraph('6.3 Precios', h2))
story.append(Paragraph(
    'En la sección de precios configurás el precio base de las viandas '
    'y el costo de envío a domicilio. Estos valores se usan como referencia '
    'al tomar pedidos.',
    body
))

story.append(Paragraph('6.4 Actualizaciones', h2))
story.append(Paragraph(
    'Comida Mecha se actualiza periódicamente. En "Ajustes" → "Actualizaciones" '
    'podés verificar si hay una versión nueva disponible. Si la hay, '
    'podés descargar el APK directamente desde la aplicación.',
    body
))
story.append(Spacer(1, 1*cm))

# Closing
story.append(hr())
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph(
    'Gracias por usar Comida Mecha. Este manual cubre las funciones principales; '
    'si tenés dudas o sugerencias, no dudes en consultar.',
    ParagraphStyle('Closing', fontSize=11, textColor=MUTED, fontName='Helvetica-Oblique',
                    alignment=TA_CENTER, spaceAfter=4)
))

# Build
doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
print(f'PDF generado: {OUTPUT}')
