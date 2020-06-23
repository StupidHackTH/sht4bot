const axios = require('axios')

module.exports = async function onMessage(message, { client, firebase, storeRef }) {
  if (message.author.bot) {
    return
  }
  if (typeof message.content !== 'string') {
    return
  }
  const text = message.content.trim()
  console.log(`[${new Date().toJSON()}] ${message.author.tag} ${JSON.stringify(text)}`)
  
  const adminIds = [
    // flicknote
    '104986860236877824',
  ]

  const userKey = `discord${message.author.id}`
  const ticketRef = storeRef.child('profiles').child(userKey).child('ticket')
  const authenticated = (await ticketRef.once('value')).exists()
  
  // Direct messages
  if (!message.guild) {
    if (message.content.startsWith(';')) {
      if (!adminIds.includes(message.author.id)) {
        message.reply('Unauthorized')
        return
      }
      const code = message.content.slice(1)
      message.reply(
        String(
          await new Function(
            '__code',
            'message',
            'client',
            'firebase',
            'storeRef',
            'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
          )(code, message, client, firebase, storeRef),
        ),
      )
      return
    }
    
    if (text === 'hello') {
      const url = 'https://source.unsplash.com/collection/139386?t=' + Date.now()
      message.reply(url)
      if (authenticated) {
        message.reply('Enjoy the hackathon!!')
      } else {
        message.reply('Please identify yourself by sending me your **Eventpop ticket reference code** (6 digits).')
      }
    }
    
    if (text.match(/^[a-z0-9]{6}$/)) {
      const ticketCodeRef = storeRef.child('tickets').child(text.toUpperCase())
      
      if (authenticated) {
        message.reply('Sorry, you are already authenticated.')
      } else {
        message.reply('Please identify yourself by sending me your **Eventpop ticket reference code** (6 digits).')
      }
    }
    
    return
  } // End direct messages

  const hallChannels = [
    // hall
    '721429288515010563',
    // staging hall
    '724219818190045255',
  ]
  if (hallChannels.includes(message.channel.id)) {
    axios.post(process.env.HALL_MESSAGE_SINK, {
      messageId: String(message.id),
      content: String(message.content),
      user: String(message.member.user),
      userId: String(message.member.userId),
      userTag: String(message.member.user.tag),
      memberDisplayName: String(message.member.displayName),
      memberDisplayHexColor: String(message.member.displayHexColor),
    })
  }
  
  // check mention
  if (message.content.match(/<@!724178986137026640>/)) {
    message.reply('under construction :pleading_face:')
  }
}
