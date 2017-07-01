'use strict'

const isPromise = require('is-promise')

// There are two different ways in which `talk` can `yield`:
// - non-suspending mode: it will be executed further without any incoming message.
// - suspending mode: it will be executed further only on the next incoming message.
// This Symbol is being used to differentiate the Promises `talk` returns.
const SUSPEND = Symbol.for('suspend') // indicates "wait for the incoming next message"
const INSERT = Symbol.for('insert') // indicates "pass in the next incoming message"

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

// see also https://github.com/Artazor/so/blob/abdc3f7/lib/so.js#L22-L43
const coroutine = (gen, task, msg) => {
	const tick = (task) => {
		if (!isPromise(task)) return Promise.reject(new Error('must yield a Promise'))
		return task.then(tock)
	}

	const tock = (handle) => {
		const value = ('object' === typeof handle) && (VALUE in handle) ? handle[VALUE] : handle
		const insert = !!(handle && handle[INSERT])
		const suspend = !!(handle && !!handle[SUSPEND])

		if (suspend) return createHandle(value, false, insert)

		const {done, value: task} = gen.next(insert ? msg : value)
		if (done) return Promise.resolve('----- this is the end -----') // todo

		return tick(task)
	}

	return tick(task)
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
		const task = coroutine(gen, tasks[user] || Promise.resolve(), msg)
		task.catch(console.error)
		tasks[user] = task
	}
}

Object.assign(createResponder, {createHandle, coroutine})
module.exports = createResponder
