const axios = require('axios')

module.exports = async function onMessage(message, { client }) {
  if (typeof message.content !== 'string') {
    return
  }

  const adminIds = [
    // flicknote
    '104986860236877824',
  ]

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
            'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
          )(code, message, client),
        ),
      )
      return
    }
    return
  }

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
}
