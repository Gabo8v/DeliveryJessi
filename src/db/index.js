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
    if (plate.name === 'Bandeja sola') {
      await trans.table('plates').update(plate.id, { name: 'Bandeja', sopaPrice: 1000 })
    } else if (plate.name === 'Menú sopa+bandeja') {
      await trans.table('plates').delete(plate.id)
    } else if (plate.sopaPrice === undefined) {
      await trans.table('plates').update(plate.id, { sopaPrice: 0 })
    }
  }
})

export default db
