'use strict'

const test = require('tape')
const timesSeries = require('async/timesSeries')

const createRespond = require('.')
const {createHandle, RESTART, coroutine} = createRespond
const inMemStorage = require('./in-mem-storage')

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
		yield Promise.resolve()
		const o2 = yield Promise.resolve(o1)
		t.equal(o1, o2)
		t.end()
	}

	coroutine(run(), null, [], t.ifError)
})

test('passes in at INSERT', (t) => {
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

test('works with INSERT & non-handles', (t) => {
	function* run () {
		yield Promise.resolve('out1')
		const x1 = yield Promise.resolve(createHandle(null, true))
		yield Promise.resolve()
		const x2 = yield Promise.resolve(createHandle(null, true))
		yield Promise.resolve()

		t.equal(x1, 'in1')
		t.equal(x2, 'in2')
		t.end()
	}

	const gen = run()
	coroutine(gen, null, ['in1', 'in2'], (err) => {
		t.ifError(err)
	})
})

test('handles the end properly', (t) => {
	t.plan(2 + 1)

	function* run () {
		yield Promise.resolve()
		t.pass('generator ran')
	}

	coroutine(run(), null, [], (err, val) => {
		if (err) return t.ifError(err)
		t.equal(val, RESTART)
		coroutine(run(), null, [], (err) => {
			if (err) t.ifError(err)
			else t.end()
		})
	})
})

const sendMultiple = (respond, msgs, cb) => {
	timesSeries(msgs.length, (n, cb) => {
		const msg = msgs[n]
		respond('some-user', msg)
		setTimeout(cb, 1)
	}, cb)
}

test('end-to-end test, running once', (t) => {
	t.plan(4)

	function* conversation (ctx) {
		const in1 = yield ctx.prompt('out1')
		t.equal(in1, 'in1', '1st received msg is "in1"')

		yield Promise.resolve() // dummy promise

		yield ctx.send('out2')
		const in2 = yield ctx.msg()
		t.equal(in2, 'in2', '2nd received msg is "in2"')
	}

	let i = 0
	const sendMock = (user, msg) => {
		if (i === 0) t.equal(msg, 'out1', '1st sent msg is "out1"')
		else if (i === 1) t.equal(msg, 'out2', '2nd sent msg is "out2"')
		else t.fail('send called too often')
		i++
	}

	const respond = createRespond(inMemStorage, {send: sendMock}, conversation)

	// 1 dummy message to initiate the bot
	sendMultiple(respond, ['hey', 'in1', 'in2'], (err) => {
		if (err) t.ifError(err)
		t.end()
	})
})

test('end-to-end test, running twice', (t) => {
	t.plan(4 + 3) // 4 outgoing, 3 incoming

	function* conversation (ctx) {
		const in1 = yield ctx.prompt('out1')
		t.equal(in1, 'in1', '1st received msg is "in1"')

		const in2 = yield ctx.prompt('out2')
		t.equal(in2, 'in2', '2nd received msg is "in2"')
	}

	let i = 0
	const sendMock = (user, msg) => {
		if (i === 0 || i === 2) t.equal(msg, 'out1', '1st sent msg is "out1"')
		else if (i === 1 || i === 3) t.equal(msg, 'out2', '2nd sent msg is "out2"')
		else t.fail('send called too often')
		i++
	}

	const respond = createRespond(inMemStorage, {send: sendMock}, conversation)

	// 2 dummy messages to initiate the bot
	sendMultiple(respond, ['hey', 'in1', 'in2', 'hey', 'in1'], (err) => {
		if (err) t.ifError(err)
		t.end()
	})
})
