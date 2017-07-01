'use strict'

const isPromise = require('is-promise')

// There are two different ways in which `talk` can `yield`:
// - non-suspending mode: it will be executed further without any incoming message.
// - suspending mode: it will be executed further only on the next incoming message.
// This Symbol is being used to differentiate the Promises `talk` returns.
const SUSPEND = Symbol.for('suspend') // indicates "wait for the incoming next message"
const INSERT = Symbol.for('insert') // indicates "pass in the next incoming message"

const INIT = Symbol.for('init')

const VALUE = Symbol.for('value')

const createHandle = (value, suspend, insert) => {
	const obj = Object.create(null)
	Object.defineProperty(obj, VALUE, {
		value, configurable: false, enumerable: false, writable: false
	})
	Object.defineProperty(obj, SUSPEND, {
		value: !!suspend, configurable: false, enumerable: false, writable: false
	})
	Object.defineProperty(obj, INSERT, {
		value: !!insert, configurable: false, enumerable: false, writable: false
	})
	return obj
}

const isObj = (obj) => obj && ('object' === typeof obj)

// see also https://github.com/Artazor/so/blob/abdc3f7/lib/so.js#L22-L43
const coroutine = (gen, val, msg, cb) => {
	const tick = (task) => {
		if (!isPromise(task)) return cb(new Error('must yield a Promise'))
		return task.then(tock)
	}

	const tock = (handle) => {
		const value = isObj(handle) && (VALUE in handle) ? handle[VALUE] : handle
		const insert = !!(handle && handle[INSERT])
		const suspend = !!(handle && !!handle[SUSPEND])

		if (suspend) return cb(null, createHandle(value, false, insert))

		const {done, value: task} = gen.next(insert ? msg : value)
		if (done) return cb(null, INIT)
		// if insertion is required, wait to get called with a new message
		if (insert) return cb(null, createHandle(null, false, insert))
		tick(task)
	}

	tick(Promise.resolve(val))
	.catch(cb)
}

// todo: find a better name than createResponder
const createResponder = (storage, telegram, talk) => {
	const gens = {}
	const tasks = {}

	const createCtx = (user) => {
		const insert = () => {
			return Promise.resolve(createHandle(undefined, false, true))
		}

		const send = (msg) => {
			telegram.send(user, msg)
			return Promise.resolve()
		}

		const prompt = (msg) => {
			telegram.send(user, msg)
			return Promise.resolve(createHandle(undefined, true, true))
		}

		const ctx = Object.create(storage(user))
		ctx.msg = insert
		ctx.send = send
		ctx.prompt = prompt
		return ctx
	}

	return function respond (user, msg) {
		let gen = gens[user]
		if (!gen) {
			const ctx = createCtx(user)
			gen = gens[user] = talk(ctx)
		}

		// todo: what if a 2nd message comes in while the 1st is still being processed?

		const loop = (val) => {
			let gen = gens[user]
			if (val === INIT) {
				const ctx = createCtx(user)
				gen = gens[user] = talk(ctx)
				val = null
			}

			tasks[user] = new Promise((resolve, reject) => {
				coroutine(gen, val, msg, (err, val) => {
					if (err) return console.error(err) // todo
					resolve(val)
				})
			})
		}

		if (!tasks[user]) loop(INIT)
		else tasks[user].then(loop)
	}
}

Object.assign(createResponder, {INIT, createHandle, coroutine})
module.exports = createResponder
