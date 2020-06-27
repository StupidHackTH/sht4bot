const axios = require('axios')
const _ = require('lodash')

module.exports = async function onMessage(
  message,
  { client, firebase, storeRef, audienceApp },
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
  
  const REG_END_MESSAGE = 'Team registration system has been closed. To add/remove members from your team, please contact @organizer.'

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
  const teamRoles = [...guild.roles.cache.values()]
    .filter(r => /^team/.test(r.name))
    .sort((a, b) => (a.name < b.name ? -1 : 1))
  const getTeamNames = async () =>
    (await storeRef.child('teamNames').once('value')).val() || {}

  const updateTeamList = async () => {
    const teamNames = await getTeamNames()
    const teamMsgIds = [
      '726025997815906366',
      '726025998604435486',
      '726025999011020801',
      '726025999531114606',
      '726025999971516528',
      '726026023828848660',
      '726026024302805012',
      '726026024906653807',
      '726026025351249990',
      '726026025695182848',
      '726026049208582164',
      '726026049531543592',
      '726026049984397372',
      '726026050437513236',
      '726026051624501249',
      '726026079529205820',
      '726026079839453264',
      '726026080200163398',
      '726026080259145759',
      '726026080997343243',
      '726026108881076285',
      '726026109401038968',
      '726026109728194670',
      '726026110088904727',
    ]
    const statusChannel = guild.channels.resolve('725234327457234956')
    statusChannel.messages
      .fetch('725234822531907594')
      .then(m => m.edit('**Team list:**'))
    for (const [i, r] of teamRoles.entries()) {
      const defaultName = r.name
      const teamName = teamNames[r.name] || defaultName
      const nameAppend =
        teamName !== defaultName ? ` “${escapeMarkdown(teamName)}”` : ''
      const newText = `・ ${r}${nameAppend} — ${[...r.members.values()].join(
        ' ',
      )}`.trim()
      statusChannel.messages.fetch(teamMsgIds[i]).then(m => {
        if (m.content !== newText) {
          console.log('diff', m.content, '=>', newText)
          return m.edit(newText)
        }
      })
    }

    const teamCategories = [...guild.channels.cache.values()].filter(
      c => c.type === 'category' && c.name.match(/^team/),
    )
    for (const teamCategory of teamCategories) {
      const defaultName = teamCategory.name.substr(0, 6)
      const teamName = teamNames[defaultName] || defaultName
      const targetCategoryName =
        defaultName + (teamName === defaultName ? '' : ' - ' + teamName)
      if (targetCategoryName !== teamCategory.name) {
        teamCategory.setName(targetCategoryName)
      }
    }

    const participantRole = guild.roles.resolve('721438879835619482')
    const inTeam = m =>
      teamRoles.some(t => [...m.roles.cache.values()].includes(t))
    for (const p of [...participantRole.members.values()]) {
      const hasNoTeamRole = p.roles.cache.has('725382685245309008')
      if (!inTeam(p) && !hasNoTeamRole) {
        p.roles.add('725382685245309008')
      } else if (inTeam(p) && hasNoTeamRole) {
        p.roles.remove('725382685245309008')
      }
    }
  }

  const getTeamRoleByNumber = teamNumber =>
    teamRoles.find(r => +r.name.slice(4) === +teamNumber)
  const layersRef = firebase
    .database()
    .ref(`data/${process.env.LIVE_TENANT_ID}/layers`)
  const Stage = {
    channel: guild.channels.resolve('726014801741873212'),
    async invite(teamNumber) {
      const role = getTeamRoleByNumber(teamNumber)
      await Stage.channel.createOverwrite(role, {
        CONNECT: true,
        SPEAK: true,
      })
    },
    async uninvite() {
      for (const [id, o] of Stage.channel.permissionOverwrites) {
        if (teamRoles.find(r => r.id === id)) {
          await o.delete()
        }
      }
    },
    async showTeam(teamNumber, upNext = false) {
      const role = getTeamRoleByNumber(teamNumber)
      const teamNames = await getTeamNames()
      const teamName = _.escape(teamNames[role.name] || role.name)
      const members = [...role.members.values()]
        .map(
          r => '<span style="opacity:0.64">@</span>' + _.escape(r.displayName),
        )
        .join(' ')
      await layersRef.child(upNext ? '08-upnext' : '08-nowshowing').update({
        html: `<strong>${teamName}</strong><small>${role.name} — ${members}</small>`,
        ...(upNext ? { 'dataset/mode': 'show' } : {}),
      })
    },
    async rollVideo(videoId) {
      await Promise.all([
        layersRef.child('06-youtube').update({
          html: `<iframe class="inset-0 absolute w-full h-full" src="/youtube?v=${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`,
          activated: true,
        }),
        layersRef.child('07-title').update({ 'dataset/mode': 'small' }),
        layersRef.child('08-nowshowing').update({ 'dataset/mode': 'small' }),
        layersRef.child('08-upnext').update({ 'dataset/mode': 'hide' }),
        layersRef.child('04-meet').update({ 'dataset/mode': 'hide' }),
        layersRef.child('09-voteplease').update({ 'dataset/mode': 'show' }),
      ])
    },
    async beginRatingOnTeam(teamNumber) {
      const role = getTeamRoleByNumber(teamNumber)
      const teamNames = await getTeamNames()
      const teamName = teamNames[role.name] || role.name
      const existingData = await storeRef
        .child('ratings')
        .child(role.name)
        .child('votes')
        .once('value')
        .then(s => s.val())
      await audienceApp
        .database()
        .ref(`sht4`)
        .update({
          currentTeam: role.name,
          teamName: teamName,
        })
      await audienceApp
        .database()
        .ref(`sht4`)
        .child('votes')
        .set(existingData)
    },
    async saveRatingData() {
      const data = (await audienceApp
        .database()
        .ref('sht4')
        .once('value')).val()
      const team = data.currentTeam
      await storeRef
        .child('ratings')
        .child(team)
        .set(data)
    },
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

    // arbitrary code execution
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
        Stage,
        audienceApp,
      }
      try {
        message.reply(
          String(
            await new Function(
              '__code',
              ...Object.keys(context),
              'try { return eval(__code) } catch (error) { return "```\\n" + (error.stack || error) + "\\n```" }',
            )(code, ...Object.values(context)),
          ),
        )
      } catch (error) {
        message.reply(String(error))
      }
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

    if (text.toLowerCase() === 'submit') {
      const alreadyInTeamRoles = teamRoles.filter(r =>
        r.members.has(message.author.id),
      )
      if (alreadyInTeamRoles.length === 0) {
        message.reply('This command requires you to be inside a team, sorry…')
        return
      }
      for (const r of alreadyInTeamRoles) {
        message.reply(
          'Submit form for **' +
            r.name +
            '** — https://stupidhackth.github.io/4/submit.html#tn=' +
            (await storeRef
              .child('dataTenants')
              .child(r.name)
              .once('value')).val(),
        )
      }
      return
    }

    // claim
    if (text.match(/^\d{1,2}$/)) {
      // awardee
      if (!member.roles.cache.has('726361729554055169')) {
        message.reply(
          'Sorry, only prize awardees can claim prizes. ' +
            'However, we have free swags for everyone!',
        )
        return
      }
      const availablePrizes = await storeRef
        .child('availablePrizes')
        .once('value')
        .then(s => s.val() || {})
      const claimed = await storeRef
        .child('prizeClaims')
        .once('value')
        .then(s => s.val() || {})
      const alreadyClaimed = Object.keys(claimed).filter(k => claimed[k] === member.id)
      const available = Object.keys(availablePrizes).filter(k => !claimed[k])
      const prizeKey = 'p' + text.toLowerCase()
      if (alreadyClaimed.length > 0 && alreadyClaimed[0] !== prizeKey) {
        message.reply('Sorry, you already claimed another prize.')
        return
      }
      const availableNumbers = available.map(k => k.slice(1)).join(', ')
      if (!availablePrizes[prizeKey]) {
        message.reply('Sorry, this prize number is not available. Available prizes are: ' + availableNumbers)
        return
      }
      const claimResult = await storeRef
        .child('prizeClaims')
        .child(prizeKey)
        .transaction(v => {
          return v || member.id
        })
      const result = claimResult.snapshot.val()
      if (result !== member.id) {
        message.reply(`Sorry, someone else already claimed that prize! Available prizes are: ${availableNumbers}`)
        return
      }
      message.reply(`Prize claiming successful!`)
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
      message.reply(
        `https://docs.google.com/spreadsheets/d/1oTRklEoz-eD2xJrfRK8TFH1GKh2zf0lxMCNYn1HJR4A/edit#gid=128723652`,
      )
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

  const backstageChannels = ['726015230567776337']
  if (backstageChannels.includes(message.channel.id)) {
    let inviteChannel = '721429288515010563' // hall-chat
    // inviteChannel = '726015230567776337' // backstage
    try {
      // next - invite up stage
      {
        const m = text.match(/^n (\d+)/)
        if (m) {
          const n = +m[1]
          await Stage.uninvite()
          await Stage.invite(n)
          await Stage.showTeam(n, true)
          const teamRole = getTeamRoleByNumber(n)
          await guild.channels
            .resolve(inviteChannel)
            .send(
              `${teamRole}, please come up on stage (**stage** voice channel)! Please mute the YouTube video while on stage.`,
            )
          message.reply('Invited')
          return
        }
      }
      // next - roll video
      {
        const m = text.match(/^r (\d+)/)
        if (m) {
          const n = +m[1]
          await Stage.showTeam(n, false)
          const teamRole = getTeamRoleByNumber(n)
          const tenantId = await storeRef
            .child('dataTenants')
            .child(teamRole.name)
            .once('value')
            .then(s => s.val())
          const videoId = await firebase
            .database()
            .ref(`/data/${tenantId}`)
            .child('youtube')
            .once('value')
            .then(s => s.val())
          if (!videoId) {
            message.reply('No video!')
            return
          }
          await Stage.rollVideo(videoId)
          message.reply('Rolling video! https://youtu.be/' + videoId)
          setTimeout(async () => {
            try {
              await Stage.saveRatingData()
              await Stage.beginRatingOnTeam(n)
            } catch (error) {
              console.log(error)
              message.reply(`${error}`)
            }
          }, 15e3)
          return
        }
      }
    } catch (error) {
      console.log(error)
      message.reply(`${error}`)
    }
  }

  // check mention
  const botSpamChannelIds = [
    // staging
    '724518717370662982',
    // production
    '724181245134897202',
  ]
  if (text.match(/^<@!?724178986137026640>/)) {
    const command = text.replace(/^<@!?724178986137026640>/, '').trim()
    const member = message.member
    const inBotSpam = botSpamChannelIds.includes(message.channel.id)
    const replyBotSpamOnly = () => {
      message.reply('Please use this command in <#724181245134897202> only.')
    }
    const inTeamChannel = /^text\d\d$/.test(message.channel.name)
      ? message.channel.name.replace(/text/, 'team')
      : null
    const replyTeamChannelOnly = (thing = 'this command') => {
      message.reply(`Please use ${thing} in your team channel only.`)
      message.delete()
    }
    if (command.match(/^add/i)) {
      if (!inBotSpam) {
        replyBotSpamOnly()
        return
      }
      const allParticipants = [...participantRole.members.values()]
      const mentionedParticipants = allParticipants.filter(m => {
        return message.mentions.users.has(m.id) // && m.id !== message.author.id
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
      const existingTeamRoles = teamRoles.filter(r =>
        r.members.has(message.author.id),
      )
      if (existingTeamRoles.length > 1) {
        const selectedTeam = existingTeamRoles.find(r =>
          message.mentions.roles.has(r.id),
        )
        if (selectedTeam) {
          existingTeamRoles.length = 0
          existingTeamRoles[0] = selectedTeam
        } else {
          message.reply(
            'You are in multiple teams. Please tag the team you want to add the new members to.',
          )
          return
        }
      }
      const [existingTeamRole] = existingTeamRoles
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
    if (command.match(/^leave/i)) {
      if (!inBotSpam) {
        replyBotSpamOnly()
        return
      }
      const alreadyInTeamRoles = teamRoles.filter(r =>
        r.members.has(message.author.id),
      )
      if (alreadyInTeamRoles.length > 1) {
        const selectedTeam = alreadyInTeamRoles.find(r =>
          message.mentions.roles.has(r.id),
        )
        if (selectedTeam) {
          alreadyInTeamRoles.length = 0
          alreadyInTeamRoles[0] = selectedTeam
        } else {
          message.reply(
            'You are in multiple teams. Please tag the team you want to leave.',
          )
          return
        }
      }
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

    if (command.match(/^name /i)) {
      if (!inTeamChannel) {
        replyTeamChannelOnly('the `name` command')
        return
      }
      const newTeamName = command
        .replace(/^name\s+/i, '')
        .trim()
        .slice(0, 64)
      await storeRef
        .child('teamNames')
        .child(inTeamChannel)
        .set(newTeamName)
      message.reply(
        `OK — ${inTeamChannel}’s name is now “${escapeMarkdown(newTeamName)}”`,
      )
      updateTeamList()
      return
    }

    const replyDeprecatedSubmissionCommand = thing => {
      message.reply(
        `Sorry, ${thing} is deprecated. Please access the submission form by sending a DM to <@!724178986137026640> saying “submit”`,
      )
      message.delete()
    }
    if (command.match(/^description /i)) {
      replyDeprecatedSubmissionCommand('the `description` command')
      return
    }
    if (command.match(/^url /i)) {
      replyDeprecatedSubmissionCommand('the `url` command')
      return
    }
    if (command.match(/^video /i)) {
      replyDeprecatedSubmissionCommand('the `video` command')
      return
    }
    if (command.match(/^submit/i)) {
      message.reply(
        `To submit, please send a DM saying “submit” to me, <@!724178986137026640>.`,
      )
      return
    }
    if (command.toLowerCase() === 'info') {
      replyDeprecatedSubmissionCommand('the `info` command')
      return
    }
    if (command.toLowerCase() === 'help') {
      message.reply(
        `https://docs.google.com/spreadsheets/d/1oTRklEoz-eD2xJrfRK8TFH1GKh2zf0lxMCNYn1HJR4A/edit#gid=128723652`,
      )
      return
    }

    message.reply('unknown command :pleading_face: -- try ‘help’')
  }
}

// https://stackoverflow.com/a/39543625/559913
function escapeMarkdown(text) {
  var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1') // unescape any "backslashed" character
  var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1') // escape *, _, `, ~, \
  return escaped
}
