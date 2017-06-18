'use strict'

const isPromise = require('is-promise')

const decorate = (promise, trait) => {
	Object.defineProperty(promise, trait, {
		value: true,
		configurable: false,
		enumerable: false,
		writable: false
	})
}

// There are two different ways in which `talk` can `yield`:
// - non-suspending mode. `talk` will be called further without any incoming message.
// - suspending more. `talk` will be called again only on the next incoming message.
// This Symbol is being used to differentiate the Promises `talk` returns.
const SUSPEND = Symbol.for('suspend') // indicates "wait for the incoming next message"
const INSERT = Symbol.for('insert') // indicates "pass in the incoming message"

// see also https://github.com/Artazor/so/blob/abdc3f7/lib/so.js#L22-L43
const coroutine = (gen, task, msg) => {
	let i = 0

	const tick = (insert) => (val) => {
		const {value: task, done} = insert ? gen.next(msg) : gen.next(val)

		if (done) return Promise.resolve('bla bla end') // todo
		if (!isPromise(task)) return Promise.reject(new Error('must yield Promise'))
		const suspend = !!task[SUSPEND]
		if (suspend || insert) return task

		const nextInsert = !!task[INSERT]
		return task.then(tick(nextInsert))
	}

	const suspend = !!task[SUSPEND]
	const insert = !!task[INSERT]
	return task.then(tick(suspend, insert))
}

// todo: find a better name than createResponder
const createResponder = (storage, telegram, talk) => {
	const gens = {}
	const tasks = {}

	const createCtx = (user) => {
		const insert = () => {
			const out = Promise.resolve()
			decorate(out, INSERT)
			return out
		}

		const send = (msg) => {
			telegram.send(user, msg)
			return Promise.resolve()
		}

		const prompt = (msg) => {
			const out = send(msg)
			decorate(out, SUSPEND)
			decorate(out, INSERT)
			return out
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
		const task = tasks[user] || Promise.resolve(null)
		tasks[user] = coroutine(gen, task, msg)
		tasks[user].catch(console.error)
	}
}

Object.assign(createResponder, {decorate, SUSPEND, INSERT, coroutine})
module.exports = createResponder
