require("dotenv").config()
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const fs = require("fs")
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async')

const client = new Client({ intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.GuildPresences
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

	let lastGame = null

	setIntervalAsync(async () => {
		try {
			console.log("running task")

			const user = await (await client.guilds.fetch(process.env.GUILD_ID)).members.fetch(process.env.USER_ID)
			if (!user) {
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
				const activity = user.presence.activities[0];

				console.log("playing", activity.type, activity.name, activity.details, activity.createdTimestamp, activity.state)

				if (!lastGame) {
					if (activity.type == ActivityType.Playing) {
						console.log("playing new game")
						lastGame = activity
					}
				} else if (lastGame.createdTimestamp !== activity.createdTimestamp && activity.type == ActivityType.Playing) {
					console.log("playing new game")
					addGame(lastGame)
					lastGame = activity
				} else {
					console.log("playing same game")
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
					await user.send(`<@${process.env.USER_ID}>, du har spelat\`${percent}%\` mer än din speltid idag! :angry:`)
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

client.login(process.env.TOKEN)