const axios = require('axios')

module.exports = function onMessage(message, { client }) {
  if (typeof message.content !== 'string') {
    return
  }
  if (
    [
      // hall
      '721429288515010563',
      // staging hall
      '724219818190045255',
    ].includes(message.channel.id)
  ) {
    axios.post(process.env.HALL_MESSAGE_SINK, {
      messageId: String(message.id),
      content: String(message.content),
      user: String(message.member.user),
      userTag: String(message.member.user.tag),
      memberDisplayName: String(message.member.displayName),
      memberDisplayHexColor: String(message.member.displayHexColor),
    })
  }
}
