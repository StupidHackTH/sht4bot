const axios = require('axios')

module.exports = async function onMessage(message, { client, firebase, storeRef }) {
  const guild = client.guilds.resolve('721429287999111189')
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
  const userTicketRef = storeRef.child('profiles').child(userKey).child('ticket')
  const authenticated = (await userTicketRef.once('value')).exists()
  
  // Direct messages
  if (!message.guild) {
    const member = guild.members.resolve(message.author.id)
    if (!member) {
      message.reply('You are not in the hackathon discord server. Please join first!')
      return
    }

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
            'guild',
            'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
          )(code, message, client, firebase, storeRef, guild),
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
      return
    }

    // Authentication
    if (text.match(/^[a-z0-9]{6}$/i)) {
      const ticketCodeRef = storeRef.child('tickets').child(text.toUpperCase())
      const ticketCodeFound = (await ticketCodeRef.once('value')).exists()
      if (ticketCodeFound && authenticated) {
        message.reply('Sorry, you Discord account is already linked to Eventpop ticket. Please contact organizers for assistance.')
        return
      } else if (ticketCodeFound) {
        await userTicketRef.set(ticketCodeRef.key)
        await member.roles.add('721438879835619482') // Add participant role
        message.reply('Thank you, enjoy the hackathon!')
        return
      } else if (!authenticated) {
        message.reply('Sorry, ticket code not found.')
        return
      }
    }

    // New team
    if (text.toLowerCase() === 'new team') {
      const teamRoles = [...guild.roles.cache.values()].filter(r => /^team/.test(r.name))
      const vacantTeamRoles = teamRoles.filter(r => r.members.size === 0).sort(() => Math.random() - 0.5)
      const alreadyInTeamRoles = teamRoles.filter(r => r.members.has(message.author.id))
      if (alreadyInTeamRoles.length > 0) {
        message.reply('You already have a team. To leave your current team, say "leave team".')
        return
      }
      if (vacantTeamRoles.length === 0) {
        message.reply('Sorry, we have a maximum limit of 24 teams. Please join join an existing team or contact organizers for help.')
        return
      }
      const role = vacantTeamRoles[0]
      await member.roles.add(role)
      const joinKey = String(100000 + Math.floor(Math.random() * 900000))
      const joinKeyRef = storeRef.child('teams').child(role.name).child('joinKey')
      await joinKeyRef.set(joinKey)
      message.reply(`You are now on **${role.name}**. Other people can join your team by saying: "join ${role.name} ${joinKey}"`)
      return
    }

    // Leave team
    if (text.toLowerCase() === 'leave team') {
      const teamRoles = [...guild.roles.cache.values()].filter(r => /^team/.test(r.name))
      const alreadyInTeamRoles = teamRoles.filter(r => r.members.has(message.author.id))
      if (alreadyInTeamRoles.length > 0) {
        for (const role of alreadyInTeamRoles) {
          await member.roles.remove(role)
          message.reply(`You left **${role.name}**.`)
        }
        return
      } else {
        message.reply(`You are not in a team. You must be inside a team in order to leave it.`)
        return
      }
    }
    
    // Join team
    {
      const match = text.match(/^join (team\d+) (\d+)$/i)
      if (match) {
        const teamRoles = [...guild.roles.cache.values()].filter(r => /^team/.test(r.name))
        const alreadyInTeamRoles = teamRoles.filter(r => r.members.has(message.author.id))
        if (alreadyInTeamRoles.length > 0) {
          message.reply('You already have a team. To leave your current team, say "leave team".')
          return
        }
        const teamName = match[1].toLowerCase()
        const role = teamRoles.find(r => r.name === teamName)
        if (!role) {
          message.reply(`Sorry, ${teamName} not found.`)
          return
        }
        const joinKeyRef = storeRef.child('teams').child(role.name).child('joinKey')
        const joinKey = (await joinKeyRef.once('value')).val()
        if (match[2] === joinKey) {
          await member.roles.add(role)
          message.reply(`You are now on **${role.name}**. Other people can join your team by saying: "join ${role.name} ${joinKey}"`)
        } else {
          message.reply(`Sorry, join passcode is incorrect. Please make sure you have the correct join passcode, and try again. Please contact the organizers if you need help.`)
        }
        return
      }
    }
    
    if (text === 'help') {
      message.reply(`To write later............`)
      return
    }

    message.reply(`Unknown command. Say "help" for help.`)
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
