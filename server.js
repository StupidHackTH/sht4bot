const express = require('express')
const app = express()
const Discord = require('discord.js')
const client = new Discord.Client()

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  const id = require.resolve('./handlers/message')
  delete require.cache[id]
  require(id)(msg, { client })
})

app.use(express.static('public'))

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
