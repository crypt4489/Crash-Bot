require('dotenv').config();

const filePrefix = process.env.PREFIX;
const helpString = ">>> Supported Commands: \n\n"+
                    "/show {tag} \n"+
                    "/submit {tag} {link} or attachment (must be a gif) \n"+
                    "/list \n"; 
const Discord = require('discord.js');
const request = require(`https`);
const fs = require(`fs`);
const CronJob = require('cron').CronJob;
const client = new Discord.Client();
var guildManager;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    guildManager = client.guilds.cache.get(process.env.GUILD_ID);
});

client.on('message', msg => {
    const messageContent = msg.content;
    const channel = msg.channel;
    if (messageContent.startsWith("/")) {
        const arguments = messageContent.split(" ");
        console.log(arguments);
        switch(arguments[0]) {
            case "/show":
                if (arguments.length == 1) {
                    msg.reply("too few arguments. add an expression to display")
                    return;
                }
                var status = showImage(channel, arguments[1]);
                if (status == "NO_IMAGE") {
                    msg.reply("no image for ".concat(arguments[1]).concat(". try typing /list for expressions"));
                    return;
                } else if (status == "FILE_ERROR") {
                    msg.reply("sry, there was an error :(");
                    return;
                }
                if (guildManager.members.cache.get(client.user.id).hasPermission("MANAGE_MESSAGES")) {
                    msg.delete();
                }
                return;
            case "/submit":
                if (arguments.length == 1) {
                    msg.reply("Need an expression");
                    return;
                }
                var status = "NULL";
                if (arguments.length == 2) {
                    status = submitGifAttach(msg, arguments[1]);
                }
                if (arguments.length == 3) {
                    status = submitGifLink(arguments);
                }
                if (status == "SUCCESS") {
                    if (guildManager.members.cache.get(client.user.id).hasPermission("MANAGE_MESSAGES")) {
                        msg.delete();
                    }
                    return;
                } else if (status == "NOT_GIF") {
                    msg.reply("No gif submitted");
                } else if (status == "NOT_UNIQUE_TAG") {
                    msg.reply("duplicate expression. try /list");
                } else if (status == "FAILED_UPLOAD") {
                    msg.reply("gif failed to upload. sorry :(")
                } else if (status == "NO_ATTACH") {
                    msg.reply("no attachment or link to gif");
                } else {
                    msg.reply("Incorrect format. Try typing /help");
                }
                return;
            case "/list":
                const tags = listTags();
                if (status == "FILE_ERROR") {
                    msg.reply("sry there was an error :(");
                    return;
                }
                channel.send(tags);
                return;
            case "/help":
                channel.send(helpString);
                return;
            default:
                return;
        }
    }
    msg.mentions.users.forEach(function (user) {
        if (user.id === client.user.id) 
        {
            getRandomImage(channel);
            return;
        }
    });
    if (channel.type === "dm") {
        //if (channel.recipient.username === "crypt4489") {
            client.channels.fetch(process.env.GENERAL_ID)
            .then(channel => channel.send(messageContent))
            .catch(console.error)
        //}
    }
});

const job = new CronJob('00 20 16 * * *', function() {
    client.channels.fetch(process.env.GENERAL_ID)
        .then(channel => {
            channel.send("happy 420! @everyone");
            getRandomImage(channel);
        })
        .catch(console.error);
    
})

//job.start();

function showImage(channel, tag) {
    const path = ".\\images\\".concat(filePrefix).concat(tag).concat(".gif");
    try {
        fs.accessSync(path, fs.constants.F_OK);
    } catch(err) 
    {
        console.log(err);
        return "NO_IMAGE";
    }
    channel.send("", {files : [path]});
    return "SUCCESS";
}

function submitGifAttach(msg, tag) {
    var status = checkTag(tag);
    if (status == 1) {
        return "NOT_UNIQUE_TAG"
    }
    if (msg.attachments.first()) {
        if (msg.attachments.first().name.endsWith(".gif")) {
            try {
                request.get(msg.attachments.first().url, function(response) {
                    if (response.statusCode === 200) {
                        const path = ".\\images\\".concat(filePrefix).concat(tag).concat(".gif");
                        response.pipe(fs.createWriteStream(path));
                    } 
                })
            } catch(error) {
                console.log(error);
                return "FAILED_UPLOAD"
            }
        } else {
            return "NOT_GIF";
        }
    } else {
        return "NO_ATTACH";
    }

    return "SUCCESS"
}

function submitGifLink(arguments) { 
    var status = checkTag(arguments[1]);
    if (status == 1) {
        return "NOT_UNIQUE_TAG"
    }
    tag = arguments[1];   
    if (arguments[2].endsWith(".gif")) {
        try {
            request.get(arguments[2], function(response) {
                if (response.statusCode === 200) {
                    const path = ".\\images\\".concat(filePrefix).concat(tag).concat(".gif");
                    response.pipe(fs.createWriteStream(path));
                } 
            })
        }
        catch(error) {
            console.log(error);
            return "FAILED_UPLOAD"
        }
    } else {
        return "NOT_GIF";
    }
    return "SUCCESS";
}

function checkTag(submitTag) {
    const path = ".\\images\\".concat(filePrefix).concat(submitTag).concat(".gif");
    try {
        fs.accessSync(path, fs.constants.F_OK);
    } catch(err) 
    {
        return 0;
    }
    return 1;
}

function listTags() {
    var tags = getGifTags();
    if (tags === "error") {
        return "FILE_ERROR";
    }
    var result = ">>> expressions: \n\n"
    for (i in tags) {
        result += tags[i];
        result += "\t";
        if ((Number(i)+1) % 5 === 0) {
            result += "\n";
        }
    }
    return result
}

function getGifTags() {
    var tags = [];
    try {
        fs.readdirSync(".\\images\\").forEach(file => {
                if (file.endsWith(".gif")) {
                    const tag = file.slice(filePrefix.length, file.length-4);
                    tags.push(tag); 
                }
        })
    } catch (error) {
        console.log(error);
        return "error";
    }
    return tags;
}

function getRandomImage(channel) {
    try {
        const images = fs.readdirSync(".\\images\\");
        const seedNumber = getRandomInt(images.length);
        const path = ".\\images\\".concat(images[seedNumber]);
        channel.send("", {files : [path]})       
    } catch (error) {
        console.log(error);
        return "error";
    }
}

function getRandomInt(length) {
    return Math.floor(Math.random() * Math.floor(length));
}

client.login(process.env.DISCORD_TOKEN);