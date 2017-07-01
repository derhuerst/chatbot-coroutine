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

	coroutine(run(), null, [], t.ifError)
})

test('stops at SUSPEND', (t) => {
	function* run () {
		const x = yield Promise.resolve(createHandle(null, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), null, ['in'], t.ifError)
})

test('passes in later at INSERT', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const x = yield Promise.resolve(createHandle(null, true))

		t.equal(x, 'in')
		t.end()
	}

	coroutine(run(), null, ['in'], t.ifError)
})

test('works with two queue items', (t) => {
	function* run () {
		const x1 = yield Promise.resolve(createHandle(null, true))
		const x2 = yield Promise.resolve(createHandle(null, true))

		t.equal(x1, 'in1')
		t.equal(x2, 'in2')
		t.end()
	}

	coroutine(run(), null, ['in1', 'in2'], (err) => {
		t.ifError(err)
	})
})
