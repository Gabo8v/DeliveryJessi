import Dexie from 'dexie'

const db = new Dexie('ComidaMecha')

db.version(5).stores({
  plates: '++id, name, active',
  clients: '++id, name, phone, fiado',
  orders: '++id, date, clientId, status, createdAt',
  payments: '++id, clientId, date, createdAt',
  menuOfDay: 'date',
  dailyCloses: 'date'
})

db.version(6).stores({
  plates: '++id, name, active',
  clients: '++id, name, phone, fiado',
  orders: '++id, date, clientId, status, createdAt',
  payments: '++id, clientId, date, createdAt',
  menuOfDay: 'date',
  dailyCloses: 'date'
}).upgrade(async trans => {
  const plates = await trans.table('plates').toArray()
  for (const plate of plates) {
    if (['Bandeja', 'Bandeja sola', 'Menú sopa+bandeja'].includes(plate.name)) {
      await trans.table('plates').delete(plate.id)
      continue
    }
    const updates = {}
    if (plate.sopaPrice === undefined || plate.sopaPrice === 0) {
      updates.sopaPrice = 1000
    }
    if (!plate.offers || plate.offers.length === 0) {
      if (plate.name === 'Locro') updates.offers = [{ label: '3x$10000', qty: 3, totalPrice: 10000 }]
      else if (plate.name === 'Sopa de maní') updates.offers = [{ label: '2x$5000', qty: 2, totalPrice: 5000 }]
    }
    if (Object.keys(updates).length > 0) {
      await trans.table('plates').update(plate.id, updates)
    }
  }
})

export default db
