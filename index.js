'use strict'

const isPromise = require('is-promise')

// The `conversation` generator function is supposed to `yield` Promises. It may yield regular Promises – which just resolve with a value. To request a chat message from the coroutine, it may resolve with a special markup: an object with the `INSERT` flag set to true.
const VALUE = Symbol.for('value')
const INSERT = Symbol.for('insert')
const RESTART = Symbol.for('restart')

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
const mustYieldPromise = 'The `conversation` generator function must always yield Promises.'

// see also https://github.com/Artazor/so/blob/abdc3f7/lib/so.js#L22-L43
const coroutine = (gen, val, queue, cb) => {
	const tick = (task) => {
		if (!isPromise(task)) return cb(new Error(mustYieldPromise))
		task.then(tock).catch(cb)
	}

	const tock = (handle) => {
		let value = handle, insert = false
		if (isObj(handle) && (VALUE in handle)) {
			value = handle[VALUE]
			insert = !!handle[INSERT]
		}

		if (insert && queue.length === 0) {
			// wait for a new message
			return cb(null, createHandle(null, insert))
		}

		try {
			const {done, value: task} = gen.next(insert ? queue.shift() : value)
			if (done) return cb(null, RESTART)
			tick(task)
		} catch (err) {
			cb(err)
		}
	}

	tick(Promise.resolve(val))
}

const createRespond = (storage, telegram, conversation, onError) => {
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

		// todo: migrate to the levelUP API, wrap in promises here
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

			if (val === RESTART) {
				gen = gens[user] = conversation(createCtx(user))
				queue = queues[user] = []
				val = null
			}

			tasks[user] = new Promise((resolve, reject) => {
				coroutine(gen, val, queue, (err, val) => {
					if (err) onError(user, err)
					else resolve(val)
				})
			})
		}

		let queue = queues[user]
		if (!queue) queue = queues[user] = []

		queue.push(msg)
		if (!tasks[user]) loop(RESTART)
		else tasks[user].then(loop)
	}
}

Object.assign(createRespond, {RESTART, createHandle, coroutine})
module.exports = createRespond
