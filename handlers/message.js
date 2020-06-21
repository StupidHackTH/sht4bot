module.exports = function onMessage(message, { client }) {
  if (typeof message.content !== 'string') {
    return
  }
}
