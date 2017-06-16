'use strict'

const test = require('tape')

const createResponder = require('.')
const {decorate, SUSPEND, INSERT, coroutine} = createResponder

test('coroutine stops at SUSPEND', (t) => {
	function* run () {
		yield Promise.resolve(1)
		const p = Promise.resolve(2)
		decorate(p, SUSPEND)
		yield p
		// should never get here
		yield Promise.resolve(3)
	}

	coroutine(run(), Promise.resolve(), 'foo')
	.then((val) => {
		t.equal(val, 2)
		t.end()
	})
	.catch(t.ifError)
})

test('coroutine passes in at INSERT', (t) => {
	function* run () {
		const p = Promise.resolve(2)
		decorate(p, INSERT)
		const x = yield p
		t.equal(x, 'foo')
		t.end()
	}

	coroutine(run(), Promise.resolve(), 'foo')
	.catch(t.ifError)
})
