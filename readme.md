# chatbot-coroutine

**Abstract chatbot message into conversations.** A [coroutine](https://en.wikipedia.org/wiki/Coroutine) that allows you to write chatbot conversations using [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator).

[![npm version](https://img.shields.io/npm/v/chatbot-coroutine.svg)](https://www.npmjs.com/package/chatbot-coroutine)
[![build status](https://img.shields.io/travis/derhuerst/chatbot-coroutine.svg)](https://travis-ci.org/derhuerst/chatbot-coroutine)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/chatbot-coroutine.svg)
[![chat on gitter](https://badges.gitter.im/derhuerst.svg)](https://gitter.im/derhuerst)


## Rationale

Have you ever wrote chatbot code looking like this?

```js
const data = {}

myChatbot.on('message', (user, msg) => {
	if (!data[user]) data[user] = {state: 0}
	const d = data[user]

	if (d.state === 0) {
		d.state = 1
		bot.send(user, 'Tell me foo!')
	if (d.state === 1) {
		d.foo = msg
		d.state = 2
		bot.send(user, 'Tell me bar!')
	} else if (d.state === 2) {
		d.state = 0
		bot.send(user, `foo: ${foo} bar: ${msg}`)
	}

	delete data[user]
})
```

**Now this example is still very naive**, as it doesn't handle invalid input and keeps data only in memory. But it demonstrates how such a structure can get quickly get very complex. Using `chatbot-coroutine`, you can **model your converstional bot like you would reason about it: As one coherent flow of incoming and outgoing messages**:

```js
const createResponder = require('chatbot-coroutine')
const inMemStorage = require('chatbot-coroutine/in-mem-storage')

const conversation = function* (ctx) {
	let foo = yield ctx.prompt('Tell me foo!')
	let bar = yield ctx.prompt('Tell me bar!')
	yield ctx.send(`foo: ${foo} bar: ${bar}`)

	yield ctx.clear()
}

const respond = createResponder(inMemStorage, myChatbot, conversation)
myChatbot.on('message', respond)
```

To make the code handle crashes, write it like this:

```js
const conversation = function* (ctx) {
	let foo = yield ctx.read('foo')
	if (!foo) {
		foo = yield ctx.prompt('Tell me foo!')
		yield ctx.write('foo', foo)
	}

	let bar = yield ctx.read('bar')
	if (!bar) {
		bar = yield ctx.prompt('Tell me bar!')
		yield ctx.write('bar', bar)
	}

	yield ctx.send(`foo: ${foo} bar: ${bar}`)
	yield ctx.clear()
}
```


## Installing

```shell
npm install chatbot-coroutine
```


## Usage

Write a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) that represents the conversation the bot will have. See [Rationale](#rationale) for an example.

```js
const conversation = function* (ctx, store) {
	// instructions
}
```

Using `createResponder`, create a `respond` function from it. Pass in a storage adapter that fits your needs.

```js
const createResponder = require('chatbot-coroutine')
const inMemStorage = require('chatbot-coroutine/in-mem-storage')

const respond = createResponder(inMemStorage, myChatbot, conversation)
myChatbot.on('message', respond)
```

## API

### `createResponder(storage, bot, conversation)`

`bot` should have a `send(user, msg)` method.

`conversation` should be a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) function, taking only one argument `ctx`.

### `ctx.msg()`

Waits for a message from the user.

### `ctx.send(msg)`

Sends a message to the user.

### `ctx.prompt(msg)`

Shorthand for `ctx.send(msg)` + `ctx.msg()`.

### `ctx.write(key, val)`

Writes `val` at `key` to the storage. This is namespaced by the user.

### `ctx.read(key)`

Reads the value at `key` from the storage. This is namespaced by the user.

### `ctx.clear()`

Deletes everything in the storage. This is namespaced by the user.


### implementing a storage adapter

`storage` should accept a `user` (working like a namespace) and have the following methods:

- `storage(user).write(key, val)` -> `Promise` – should encode JSON
- `storage(user).read(key)` -> `Promise` – should decode JSON
- `storage(user).clear()` -> `Promise`


## Contributing

If you have a question or have difficulties using `chatbot-coroutine`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, refer to [the issues page](https://github.com/derhuerst/chatbot-coroutine/issues).
