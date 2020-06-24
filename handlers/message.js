const axios = require('axios')

module.exports = async function onMessage(
  message,
  { client, firebase, storeRef },
) {
  const guild = client.guilds.resolve('721429287999111189')
  if (message.author.bot) {
    return
  }
  if (typeof message.content !== 'string') {
    return
  }
  const text = message.content.trim()
  console.log(
    `[${new Date().toJSON()}] ${message.author.tag} ${JSON.stringify(text)}`,
  )

  const adminIds = [
    // flicknote
    '104986860236877824',
  ]

  const userKey = `discord${message.author.id}`
  const userTicketRef = storeRef
    .child('profiles')
    .child(userKey)
    .child('ticket')
  const authenticated = (await userTicketRef.once('value')).exists()
  const participantRole = guild.roles.resolve('721438879835619482')

  const updateTeamList = async () => {
    const teamRoles = [...guild.roles.cache.values()]
      .filter(r => /^team/.test(r.name))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
    const newText =
      '**Team list**:\n' +
      teamRoles
        .map(r => {
          return `・ ${r} — ${[...r.members.values()].join(' ')}`
        })
        .join('\n')
    await guild.channels
      // #status
      .resolve('725234327457234956')
      // message id
      .messages.fetch('725234822531907594')
      .then(m => m.edit(newText))
  }

  // Direct messages
  if (!message.guild) {
    const member = guild.members.resolve(message.author.id)
    if (!member) {
      message.reply(
        'You are not in the hackathon discord server. Please join first!',
      )
      return
    }

    if (message.content.startsWith(';')) {
      if (!adminIds.includes(message.author.id)) {
        message.reply('Unauthorized')
        return
      }
      const code = message.content.slice(1)
      const context = {
        message,
        client,
        firebase,
        storeRef,
        guild,
        updateTeamList,
      }
      message.reply(
        String(
          await new Function(
            '__code',
            ...Object.keys(context),
            'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
          )(code, ...Object.values(context)),
        ),
      )
      return
    }

    if (text === 'hello') {
      const url =
        'https://source.unsplash.com/collection/139386?t=' + Date.now()
      message.reply(url)
      if (authenticated) {
        message.reply('Enjoy the hackathon!!')
      } else {
        message.reply(
          'Please identify yourself by sending me your **Eventpop ticket reference code** (6 digits).',
        )
      }
      return
    }

    // Authentication
    if (text.match(/^[a-z0-9]{6}$/i)) {
      const ticketCodeRef = storeRef.child('tickets').child(text.toUpperCase())
      const ticketCodeFound = (await ticketCodeRef.once('value')).exists()
      if (ticketCodeFound && authenticated) {
        message.reply(
          'Sorry, you Discord account is already linked to Eventpop ticket. Please contact organizers for assistance.',
        )
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

    if (text === 'help') {
      message.reply(`https://docs.google.com/spreadsheets/d/1oTRklEoz-eD2xJrfRK8TFH1GKh2zf0lxMCNYn1HJR4A/edit#gid=128723652`)
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
  const botSpamChannelIds = [
    // staging
    '724518717370662982',
    // production
    '724181245134897202',
  ]
  if (text.match(/^<@!724178986137026640>/)) {
    const command = text.replace(/^<@!724178986137026640>/, '').trim()
    const member = message.member
    if (!botSpamChannelIds.includes(message.channel.id)) {
      message.reply('Please use this command in <#724181245134897202> only.')
      return
    }
    if (command.match(/^add/i)) {
      const teamRoles = [...guild.roles.cache.values()].filter(r =>
        /^team/.test(r.name),
      )
      const allParticipants = [...participantRole.members.values()]
      const mentionedParticipants = allParticipants.filter(m => {
        return message.mentions.users.has(m.id) && m.id !== message.author.id
      })
      if (mentionedParticipants.length === 0) {
        message.reply(
          'Please mention at least 1 other participant. Note that participants must confirm using their ticket code before they can be added.',
        )
        return
      }
      const unavailableParticipants = mentionedParticipants.filter(m => {
        return false /// teamRoles.some(r => r.members.has(m.id))
      })
      const availableParticipants = mentionedParticipants.filter(m => {
        return true // !teamRoles.some(r => r.members.has(m.id))
      })
      if (unavailableParticipants.length > 0) {
        message.reply(
          'These participants are already in a team, so they cannot be added: ' +
            unavailableParticipants.join(', ') +
            '.',
        )
      }
      if (availableParticipants.length === 0) {
        message.reply('No members left to form a team. Aborting.')
        return
      }
      const [existingTeamRole] = teamRoles.filter(r =>
        r.members.has(message.author.id),
      )
      const [vacantTeamRole] = teamRoles
        .filter(r => r.members.size === 0)
        .sort(() => Math.random() - 0.5)
      const addToRole = async role => {
        const membersToAdd = [...availableParticipants, message.member]
        for (const m of membersToAdd) {
          await m.roles.add(role)
        }
        const newMembers = [...role.members.values()]
        await message.reply(
          `${role} now has these members: ${newMembers.join(', ')}`,
        )
        await updateTeamList()
      }
      if (existingTeamRole) {
        await addToRole(existingTeamRole)
        return
      } else if (vacantTeamRole) {
        await addToRole(vacantTeamRole)
        return
      } else {
        message.reply(
          'Sorry, we have a maximum limit of 24 teams. Please join join an existing team or contact organizers for help.',
        )
        return
      }
      return
    }

    // Leave team
    if (command.toLowerCase() === 'leave team') {
      const teamRoles = [...guild.roles.cache.values()].filter(r =>
        /^team/.test(r.name),
      )
      const alreadyInTeamRoles = teamRoles.filter(r =>
        r.members.has(message.author.id),
      )
      if (alreadyInTeamRoles.length > 0) {
        for (const role of alreadyInTeamRoles) {
          await member.roles.remove(role)
          message.reply(`You left **${role.name}**.`)
        }
        await updateTeamList()
        return
      } else {
        message.reply(
          `You are not in a team. You must be inside a team in order to leave it.`,
        )
        return
      }
    }
    
    if (command.toLowerCase() === 'help') {
      message.reply(`https://docs.google.com/spreadsheets/d/1oTRklEoz-eD2xJrfRK8TFH1GKh2zf0lxMCNYn1HJR4A/edit#gid=128723652`)
      return
    }

    message.reply('under construction :pleading_face:')
  }
}
