'use strict'

const createResponder = require('chatbot-coroutine')
const inMemStorage = require('chatbot-coroutine/in-mem-storage')

const conversation = function* (ctx) {
	let foo = yield ctx.prompt('Tell me foo!')
	let bar = yield ctx.prompt('Tell me bar!')
	yield ctx.send(`foo: ${foo} bar: ${msg}`)

	yield ctx.clear()
}

const respond = createResponder(inMemStorage(), myChatbot, conversation)
myChatbot.on('message', respond)
