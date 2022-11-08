const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

const db = admin.firestore()
const { Timestamp } = admin.firestore

exports.onWrite = functions
  .region('asia-northeast1')
  .firestore.document('/items/{id}')
  .onWrite(async (change, context) => {
    console.log(`onWrite: ${context.params.id}`)
    const after = change.after.data()
    console.log('after', after)
  })

exports.onDelete = functions
  .region('asia-northeast1')
  .firestore.document('/items/{id}')
  .onDelete(async (snap, context) => {
    console.log(`onDelete: ${context.params.id}`)
  })

exports.updateItem = functions
  .region('asia-northeast1')
  .pubsub.schedule('*/15 * * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    const snapshot = await db
      .collection('items')
      .where('deleted', '==', true)
      .orderBy('index', 'asc')
      .limit(1)
      .get()
    if (snapshot.docs.length === 1) {
      await db
        .doc(`items/${snapshot.docs[0].id}`)
        .update({ deleted: false, updatedAt: Timestamp.now(), expireAt: null })
    }
  })

exports.init = functions.region('asia-northeast1').https.onRequest(async (req, res) => {
  const snapshot = await db.collection('items').limit(1).get()
  if (snapshot.docs.length > 0) {
    res.status(400).send('Bad Request')
    return
  }
  const expireAt = Timestamp.fromMillis(new Date().getTime() + 24 * 60 * 60 * 1000)
  const batch = db.batch()
  for (let i = 0; i < 500; i++) {
    batch.set(db.doc(`items/${i}`), {
      index: i,
      deleted: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      expireAt,
    })
  }
  await batch.commit()
  res.send('OK')
})
