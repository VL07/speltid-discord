require("dotenv").config()
const { Client, GatewayIntentBits, ActivityType, Guild } = require('discord.js');
const fs = require("fs")
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async')

const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.GuildPresences,
	GatewayIntentBits.GuildMessages
]})

const DEFAULT_DATA = {
	today: {

	},
	total: {

	},
	day: String(new Date().getTime()).padStart(2, '0'),
	start: new Date().getTime()
}

const INTERVAL = parseInt(process.env.INTERVAL)
const SPELTID = parseInt(process.env.SPELTID)

let lastGame = null

if (!fs.existsSync("data.json")) {
	console.log("data.json doesn't exist creating...")
	fs.writeFileSync("data.json", JSON.stringify(DEFAULT_DATA))
	console.log("successfully created data.json")
}

client.once('ready', () => {
	console.log("ready")
	console.log("setting bot activity")
	client.user.setActivity("someone in secret", {
		type: ActivityType.Watching
	})
	console.log("successfully set activity")

	setIntervalAsync(async () => {
		try {
			console.log("running task")
			
			const guild = await client.guilds.fetch(process.env.GUILD_ID)
			const user = guild.members.cache.get(process.env.USER_ID)
			if (!user.user) {
				console.log("ERROR! user not found")
				return
			}

			if (!user.presence || (user.presence && (!user.presence.activities || user.presence.activities.length == 0))) {
				console.log("user not playing")
				if (lastGame) {
					addGame(lastGame)
					lastGame = null
				}
			} else {
				for (const activity of user.presence.activities) {
					console.log("playing", activity.type, activity.name, activity.details, activity.createdTimestamp, activity.state)
					
					if (activity.type !== ActivityType.Playing) {
						console.log("Not a game")
						continue
					}

					if (!lastGame) {
						console.log("playing new game")
						lastGame = activity
						console.log("sending message")

						await sendMessage(`<@${process.env.USER_ID}>, glöm inte att plugga också! :book:`, guild)
					} else if (lastGame && (lastGame.createdTimestamp !== activity.createdTimestamp && activity.type == ActivityType.Playing)) {
						console.log("playing new game")
						addGame(lastGame)
						lastGame = activity
						console.log("sending message")

						await sendMessage(`<@${process.env.USER_ID}>, glöm inte att plugga också! :book:`, guild)
					} else {
						console.log("playing same game")
					}
				}
			}

			if (String(new Date().getDate()).padStart(2, '0') !== readDataFile().day) {
				newDay()
				let totalToday = 0
				const data = readDataFile()
				for (const game of Object.values(data.today)) {
					totalToday += game
				} 
				const diff = totalToday - SPELTID
				const percent = (diff / SPELTID) * 100

				console.log(totalToday, SPELTID, diff, percent)

				try {
					await sendMessage(`<@${process.env.USER_ID}>, du har spelat\`${percent}%\` mer än din speltid idag! :angry:`, guild)
				} catch (err) {
					console.log("error sending dm")
					console.log(err)
				}

				console.log("sent message to user")
			}
		} catch (err) {
			console.log("error interval")
			console.log(err)
		}

	}, INTERVAL)
})

function readDataFile() {
	const data = fs.readFileSync("data.json")
	return JSON.parse(data)
}

function saveDataFile(json) {
	const asString = JSON.stringify(json)
	fs.writeFileSync("data.json", asString)
}

function newDay() {
	console.log("new day")
	const data = readDataFile()

	data.day = String(new Date().getDate()).padStart(2, '0')

	data.today = {}

	saveDataFile(data)
}

if (String(new Date().getDate()).padStart(2, '0') !== readDataFile().day) {
	newDay()
}

function addGame(activity) {
	const data = readDataFile()
	let timestamp = new Date().getTime()

	console.log(timestamp, activity.createdTimestamp)

	if (data.today[activity.name]) {
		data.today[activity.name] += Math.round(timestamp - activity.createdTimestamp)
	} else {
		data.today[activity.name] = Math.round(timestamp - activity.createdTimestamp)
	}

	if (data.total[activity.name]) {
		data.total[activity.name] += Math.round(timestamp - activity.createdTimestamp)
	} else {
		data.total[activity.name] = Math.round(timestamp - activity.createdTimestamp)
	}

	saveDataFile(data)
}

async function sendMessage(message, guild) {
	const channel = await guild.channels.fetch(process.env.CHANNEL)

	await channel.send(message)
}

process.on("SIGINT", function() {
	console.log("before exit")
	if (lastGame) {
		console.log("adding game")
		addGame(lastGame)
		console.log("added game")
	}
	console.log("exiting")
	process.exit()
})

client.login(process.env.TOKEN)