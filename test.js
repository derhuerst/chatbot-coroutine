'use strict'

const test = require('tape')

const createResponder = require('.')
const {createHandle, coroutine} = createResponder

test('throws with non-Promise yield', (t) => {
	function* run () {
		yield 1
	}

	coroutine(run(), null, ['in'], (err) => {
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

	coroutine(run(), null, null, t.ifError)
})

test('stops at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve(createHandle('out', true, false))

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), null, 'in', (err) => {
		if (err) t.ifError(err)
		else t.end()
	})
})

test('stops later at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		yield Promise.resolve(createHandle('out2', true, false))

		t.fail('generator hasn\'t been stopped') // should never get here
	}

	coroutine(run(), null, 'in', (err) => {
		if (err) t.ifError(err)
		else t.end()
	})
})

test('passes in at INSERT', (t) => {
	function* run () {
		const x = yield Promise.resolve(createHandle('out', false, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), null, 'in', t.ifError)
})

test('passes in later at INSERT', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const x = yield Promise.resolve(createHandle('out2', false, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), null, 'in', t.ifError)
})

test('works with INSERT & SUSPEND', (t) => {
	function* run () {
		const x = yield Promise.resolve(createHandle('out', true, true))

		t.equal(x, 'in2')
		t.end()
	}

	const gen = run()
	coroutine(gen, null, 'in1', (err, val) => {
		if (err) t.ifError(err)
		else coroutine(gen, val, 'in2', t.ifError) // only to pass the SUSPEND
	})
})
