const axios = require('axios')

module.exports = async function onMessage(message, { client, firebase, dataStoreRef }) {
  if (message.author.bot) {
    return
  }
  if (typeof message.content !== 'string') {
    return
  }
  
  const adminIds = [
    // flicknote
    '104986860236877824',
  ]

  const userKey = `discord${message.author.id}`
  
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
            'dataStoreRef',
            'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
          )(code, message, client, firebase, dataStoreRef),
        ),
      )
      return
    }
    
    if (message.content.trim() === 'hello') {
      const url = 'https://source.unsplash.com/collection/139386?t=' + Date.now()
      message.reply(url)
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
  if (message.content.match(/<@724178986137026640>/)) {
    message.reply('under construction ')
  }
}
