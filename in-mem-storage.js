'use strict'

const data = Object.create(null)

const inMemStorage = (user) => {
	const read = (key) => {
		key = user + ':' + key
		return Promise.resolve(key in 'data' ? data[key] : null)
	}

	const write = (key, val) => {
		data[user + ':' + key] = val
		return Promise.resolve()
	}

	const clear = () => {
		const prefix = user + ':'
		for (let key in data) {
			if (key.slice(0, prefix.length) === prefix) delete data[key]
		}
		return Promise.resolve()
	}

	return {read, write, clear}
}

module.exports = inMemStorage
