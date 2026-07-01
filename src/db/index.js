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

export default db
