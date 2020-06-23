const express = require('express')
const app = express()
const Discord = require('discord.js')
const client = new Discord.Client()
const firebase = require('firebase');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  try {
    const id = require.resolve('./handlers/message')
    delete require.cache[id]
    await require(id)(msg, { client })
  } catch (error) {
    console.error('Cannot process message', msg.content, 'from', msg.author.tag, 'in', msg.channel, error)
  }
})

app.use(express.static('public'))

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

client.login(process.env.DISCORD_TOKEN)