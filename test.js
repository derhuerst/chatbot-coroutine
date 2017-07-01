'use strict'

const test = require('tape')

const createResponder = require('.')
const {createHandle, coroutine} = createResponder

test('throws with non-Promise yield', (t) => {
	function* run () {
		yield 1
	}

	coroutine(run(), Promise.resolve(), 'in')
	.catch((err) => {
		t.ok(err, 'error thrown')
		t.end()
	})
})

test('passes non-handle values through', (t) => {
	function* run () {
		const o1 = {foo: 'bar'}
		const o2 = yield Promise.resolve(o1)
		t.equal(o1, o2)
		t.end()
	}

	coroutine(run(), Promise.resolve(), null)
	.catch(t.ifError)
})

test('stops at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve(createHandle('out', true, false))

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), Promise.resolve(), 'in')
	.then(() => t.end())
	.catch(t.ifError)
})

test('stops later at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		yield Promise.resolve(createHandle('out2', true, false))

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), Promise.resolve(), 'in')
	.then(() => t.end())
	.catch(t.ifError)
})

test('passes in at INSERT', (t) => {
	function* run () {
		const x = yield Promise.resolve(createHandle('out', false, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), Promise.resolve(), 'in')
	.catch(t.ifError)
})

test('passes in later at INSERT', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const x = yield Promise.resolve(createHandle('out2', false, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), Promise.resolve(), 'in')
	.catch(t.ifError)
})

test('works with INSERT & SUSPEND', (t) => {
	function* run () {
		const x = yield Promise.resolve(createHandle('out', true, true))

		t.equal(x, 'in2')
		t.end()
	}

	const gen = run()
	const task = coroutine(gen, Promise.resolve(), 'in1')

	task
	.then(() => coroutine(gen, task, 'in2')) // only to pass the SUSPEND
	.catch(t.ifError)
})
