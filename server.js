const express = require('express')
const app = express()
const Discord = require('discord.js')
const client = new Discord.Client()
const firebase = require('firebase')
var firebaseConfig = {
  apiKey: 'AIzaSyBm7onpz9n5IhpQnMldcY0PbKzJFOGoH-o',
  authDomain: 'firet0y.firebaseapp.com',
  databaseURL: 'https://firet0y.firebaseio.com',
  projectId: 'firet0y',
  storageBucket: 'firet0y.appspot.com',
  messagingSenderId: '1047007358320',
  appId: '1:1047007358320:web:8c697b8a6f26ee9852f3b5',
}

firebase.initializeApp(firebaseConfig)

const storeRef = firebase.database().ref(`data/${process.env.DATASTORE_TENANT_ID}`)
storeRef.on('value', (store) => {
  console.log('Data store updated', new Date())
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', async msg => {
  try {
    const id = require.resolve('./handlers/message')
    delete require.cache[id]
    await require(id)(msg, { client, firebase, storeRef })
  } catch (error) {
    console.error(
      'Cannot process message',
      msg.content,
      'from',
      msg.author.tag,
      'in',
      msg.channel,
      error,
    )
  }
})

app.use(express.static('public'))

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

client.login(process.env.DISCORD_TOKEN)
