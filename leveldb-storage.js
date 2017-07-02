'use strict'

const levelDBStorage = (db) => (user) => {
	const read = (key) => {
		return new Promise((resolve, reject) => {
			db.get(user + ':' + key, (err, val) => {
				if (err) {
					if (err.notFound) resolve(null)
					else reject(err)
				} else resolve(val)
			})
		})
	}

	const write = (key, val) => {
		return new Promise((resolve, reject) => {
			db.put(user + ':' + key, val, (err) => {
				if (err) reject(err)
				else resolve()
			})
		})
	}

	const clear = () => {
		return new Promise((resolve, reject) => {
			const prefix = user + ':'
			const ops = []

			db.createKeyStream()
			.once('error', reject)
			.on('data', (key) => {
				if (key.slice(0, prefix.length) === prefix) {
					ops.push({type: 'del', key})
				}
			})
			.once('end', () => {
				if (ops.length === 0) return resolve()
				db.batch(ops, (err) => {
					if (err) reject(err)
					else resolve()
				})
			})
		})
	}

	return {read, write, clear}
}

module.exports = levelDBStorage
