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
    } else if (plate.sopaPrice === undefined || plate.sopaPrice === 0) {
      await trans.table('plates').update(plate.id, { sopaPrice: 1000 })
    }
  }
})

export default db
