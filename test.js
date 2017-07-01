'use strict'

const test = require('tape')

const createResponder = require('.')
const {decorate, SUSPEND, INSERT, coroutine} = createResponder

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

test('stops at SUSPEND', (t) => {
	function* run () {
		const p = Promise.resolve('out')
		decorate(p, SUSPEND)
		yield p

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), Promise.resolve(), 'in')
	.then((val) => {
		t.equal(val, 'out')
		t.end()
	})
	.catch(t.ifError)
})

test('stops later at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const p = Promise.resolve('out2')
		decorate(p, SUSPEND)
		yield p

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), Promise.resolve(), 'in')
	.then((val) => {
		t.equal(val, 'out2')
		t.end()
	})
	.catch(t.ifError)
})

test('passes in at INSERT', (t) => {
	function* run () {
		const p = Promise.resolve('out')
		decorate(p, INSERT)
		const x = yield p
		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), Promise.resolve(), 'in')
	.catch(t.ifError)
})

test('passes in later at INSERT', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const p = Promise.resolve('out2')
		decorate(p, INSERT)
		const x = yield p
		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), Promise.resolve(), 'in')
	.catch(t.ifError)
})

test('works with INSERT & SUSPEND', (t) => {
	function* run () {
		const p = Promise.resolve('out')
		decorate(p, INSERT)
		decorate(p, SUSPEND)
		const x = yield p

		t.equal(x, 'in2')
		t.end()
	}

	const gen = run()
	const task = coroutine(gen, Promise.resolve(), 'in1')
	.then((val) => {
		t.equal(val, 'out')
		return coroutine(gen, task, 'in2') // only to pass the SUSPEND
	})
	.catch(t.ifError)
})
