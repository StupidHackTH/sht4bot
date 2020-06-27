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

const audienceApp = firebase.initializeApp(
  {
    apiKey: 'AIzaSyCRRP6g0vMhR194iGM9pzDQ-C17cSGPOjo',
    authDomain: 'the-stupid-hackathon-thailand.firebaseapp.com',
    databaseURL: 'https://the-stupid-hackathon-thailand.firebaseio.com',
    projectId: 'the-stupid-hackathon-thailand',
    storageBucket: 'the-stupid-hackathon-thailand.appspot.com',
    messagingSenderId: '973484319476',
    appId: '1:973484319476:web:a4e0a8bc80cfe5f86d74a1',
  },
  'audienceApp',
)

const storeRef = firebase
  .database()
  .ref(`data/${process.env.DATASTORE_TENANT_ID}`)
storeRef.on('value', store => {
  console.log('Data store updated', new Date())
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', async msg => {
  try {
    const id = require.resolve('./handlers/message')
    delete require.cache[id]
    await require(id)(msg, { client, firebase, storeRef, audienceApp })
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
