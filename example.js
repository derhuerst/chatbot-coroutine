'use strict'

const createRespond = require('chatbot-coroutine')
const inMemStorage = require('chatbot-coroutine/in-mem-storage')

const conversation = function* (ctx) {
	let foo = yield ctx.prompt('Tell me foo!')
	let bar = yield ctx.prompt('Tell me bar!')
	yield ctx.send(`foo: ${foo} bar: ${msg}`)

	yield ctx.clear()
}

const respond = createRespond(inMemStorage(), bot, conversation, console.error)
bot.on('message', respond)
