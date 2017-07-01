'use strict'

const isPromise = require('is-promise')

// todo: explanation about this
const VALUE = Symbol.for('value')
const INSERT = Symbol.for('insert')
const INIT = Symbol.for('init')

const createHandle = (value, insert) => {
	const obj = Object.create(null)
	Object.defineProperty(obj, VALUE, {
		value, configurable: false, enumerable: false, writable: false
	})
	Object.defineProperty(obj, INSERT, {
		value: !!insert, configurable: true, enumerable: true, writable: true
	})
	return obj
}

const isObj = (obj) => obj && ('object' === typeof obj)

// see also https://github.com/Artazor/so/blob/abdc3f7/lib/so.js#L22-L43
const coroutine = (gen, val, queue, cb) => {
	const tick = (task) => {
		if (!isPromise(task)) return cb(new Error('must yield a Promise'))
		return task.then(tock)
	}

	const tock = (handle) => {
		let value = handle, insert = false
		if (isObj(handle) && (VALUE in handle)) {
			value = handle[VALUE]
			insert = !!handle[INSERT]
		}

		// wait for a new message
		if (insert && queue.length === 0) return cb(null, createHandle(null, insert))

		const {done, value: task} = gen.next(insert ? queue.shift() : value)
		if (done) return cb(null, INIT)
		tick(task)
	}

	tick(Promise.resolve(val))
	.catch(cb)
}

// todo: find a better name than createResponder
const createResponder = (storage, telegram, talk) => {
	const createCtx = (user) => {
		const insert = () => {
			return Promise.resolve(createHandle(undefined, true))
		}

		const send = (msg) => {
			telegram.send(user, msg)
			return Promise.resolve()
		}

		const prompt = (msg) => {
			telegram.send(user, msg)
			return Promise.resolve(createHandle(undefined, true))
		}

		const ctx = Object.create(storage(user))
		ctx.msg = insert
		ctx.send = send
		ctx.prompt = prompt
		return ctx
	}

	const gens = {}
	const tasks = {}
	const queues = {}

	return function respond (user, msg) {
		const loop = (val) => {
			let gen = gens[user]
			let queue = queues[user]

			if (val === INIT) {
				gen = gens[user] = talk(createCtx(user))
				queue = queues[user] = []
				val = null
			}

			tasks[user] = new Promise((resolve, reject) => {
				coroutine(gen, val, queue, (err, val) => {
					if (err) return console.error(err) // todo
					resolve(val)
				})
			})
		}

		let queue = queues[user]
		if (!queue) queue = queues[user] = []

		queue.push(msg)
		if (!tasks[user]) loop(INIT)
		else tasks[user].then(loop)
	}
}

Object.assign(createResponder, {INIT, createHandle, coroutine})
module.exports = createResponder
