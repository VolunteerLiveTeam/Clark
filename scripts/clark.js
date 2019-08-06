// Description:
//   Manages roles for the VLT Discord
// Commands:
//   hubot i agree DD/MM - will indicate that you agree to abide by the Rules of the VLT Discord followed by your birthday. 
//   hubot clear # - the number of messages to remove from a room. max 100 at a time. (Admin only)
//   i was here - Grants you a 'badge' role for the current event or live thread room to your profile!
// Author:
//   @pironic

const util = require("util");
const schedule = require('node-schedule');
const foyerID = (process.env.CLARK_FOYER_ID || '433675777641545732');
const newUserRoleName = (process.env.CLARK_NEWUSER_ROLE_NAME || 'New User');

const moment = require('moment');

module.exports = robot => {
    try {
        robot.hear(/test/i, async res => {
            try {
                
            } catch(e) {res.send("error: ```"+util.inspect(e)+"```");}
        });

        // new user joined
        robot.enter (async res => {
            // start with some vars we need
            console.log(res.message.user);
            const guild = res.message.user.guild;
            const guildMember = await guild.fetchMember(res.message.user.id);
             // New-User role. try to find the object... we'll need the id.
            const newUserRoleObj = guild.roles.find("name", newUserRoleName);
            guildMember.addRole(newUserRoleObj.id);
            console.log("new user joined: "+util.inspect(res.message.user));
        });

        robot.hear(/i was here/i, async res => {
            try {
                const guild = robot.client.guilds.get(res.message.user.guild);
                const textChannel = guild.channels.get(res.message.user.room);
                // only allow users to get badge roles for ce- or lt- rooms
                const chanPreName = textChannel.name.substring(0,3);
                if (chanPreName != "lt-" && chanPreName != "ce-") { return; }

                // its a valid room, lets react to let the user know we are doing something 
                const message = await textChannel.fetchMessage(res.message.user.message);
                var reaction = message.react('⌛'); // hourglass

                // lets make sure that hte user doesn't already have the role... waste of energy if they do
                const badeRoleName = textChannel.name;
                const guildMember = await guild.fetchMember(res.message.user.id);
                const existingMemberRole = guildMember.roles.find("name", badeRoleName);
                if (existingMemberRole === null || existingMemberRole === undefined) {
                    // confirmed. user doesn't have the role yet.
                    // now validate the role to add to the user
                    var badeRoleObj = guild.roles.find("name", badeRoleName);
                    if (badeRoleObj === null || badeRoleObj === undefined) {
                        // doesn't exist yet, make it and add to the user
                        guild.createRole({ name: badeRoleName, permissions: ["ADD_REACTIONS"] })
                        .then(newRole => guildMember.addRole(newRole))
                        .catch(console.error);
                    } else {
                        // already exists, just add to the user
                        guildMember.addRole(badeRoleObj);
                    }
                    message.react('✅'); // check mark
                } 
                reaction.then(reactionMessage => reactionMessage.remove());
            } catch(e) {console.error("error: "+util.inspect(e));}
        });

        robot.respond(/setLiveThread (?:.*live\/|)([a-z0-9]*)/i, async res => {
            const guild = robot.client.guilds.get(res.message.user.guild);
            const textChannel = guild.channels.get(res.message.user.room);
            const message = await textChannel.fetchMessage(res.message.user.message);
            var reaction = message.react('⌛'); // hourglass

            slug = res.match[1];
            url = "https://reddit.com/live/"+slug;
            game = "live/"+slug;
            json = { game: { name: game, url: url, type: "WATCHING" }, status: 'online' };
            robot.client.user.setPresence(json)
            
            message.react('✅'); // check mark
            reaction.then(reactionMessage => reactionMessage.remove());
        });
        robot.respond(/setGame(?: (.*)|)/i, async res => {
            const guild = robot.client.guilds.get(res.message.user.guild);
            const textChannel = guild.channels.get(res.message.user.room);
            const message = await textChannel.fetchMessage(res.message.user.message);
            var reaction = message.react('⌛'); // hourglass

            game = res.match[1] || 'w/ liveteam.org';
            json = { game: { name: game, type: "PLAYING" }, status: 'idle' };
            robot.client.user.setPresence(json)

            message.react('✅'); // check mark
            reaction.then(reactionMessage => reactionMessage.remove());
        });

        robot.respond(/clear(?: (\d*|all))/i, async res => {
            try {
                const guild = robot.client.guilds.get(res.message.user.guild);
                const textChannel = guild.channels.get(res.message.user.room);
                const message = await textChannel.fetchMessage(res.message.user.message);
                message.react('⌛'); // hourglass
                
                const guildMember = await guild.fetchMember(res.message.user.id);
                if (guildMember.hasPermission("MANAGE_MESSAGES")) {
                    try {
                    to_delete = (res.match[1] && res.match[1] < 100) ? res.match[1] : 100;
                    if (to_delete < 1) { return; }
                    textChannel.bulkDelete(to_delete, "requested by: "+guildMember.name)
                    .then(messages => console.log(`Bulk deleted ${messages.size} messages`))
                    .catch(console.error);
                    } catch (e) {res.send("```"+util.inspect(e)+"```");}
                } else {
                    message.delete(0, "no permission to execute this command");
                }
            } catch (e) {console.error("error: " +util.inspect(e));}
        });

        const hourlyRoomClear = schedule.scheduleJob("0 * * * *", function() {
            var guild = robot.client.guilds.some(function(guild) {
                potentialChan = guild.channels.get(foyerID)
                if (potentialChan !== null && potentialChan !== undefined && potentialChan !== 0) {
                    return guild;
                }
            });
            const textChannel = guild.channels.get(foyerID);
            textChannel.bulkDelete(100);
        })       
        // 'i agree' + delete everything else in designated room.
        robot.hear(/(.*)/i, async res => {
            try {
                // only operate in the #do-you-agree room.. aka the foyer
                if (res.envelope.room != foyerID) {  console.log("Bailing out - not in foyer"); return false; }
                
                // gather some constants needed to do my work
                var guild = robot.client.guilds.get(res.message.user.guild);
                const textChannel = guild.channels.get(res.message.user.room);
                const message = await textChannel.fetchMessage(res.message.user.message);

                // is this a pertinant message?
                if (res.message.text.toLowerCase() == "i agree") {
                    try {
                        message.react('✅'); // checkmark
                        // var reaction = message.react('⌛'); // hourglass

                        // lets not forget the member object. need that too.
                        const guildMember = await guild.fetchMember(res.message.user.id);

                        // New-User role. try to find the object... we'll need the id.
                        const newUserRoleObj = guild.roles.find("name", newUserRoleName);
                        guildMember.removeRole(newUserRoleObj);

                        // Q2-2018 role. look for it, if it doesn't exist on the server... make it.
                        const quarterlyRoleName = ""+getQuarter();
                        var quarterlyRoleObj = guild.roles.find("name", quarterlyRoleName);
                        if (quarterlyRoleObj === null || quarterlyRoleObj === undefined) {
                            guild.createRole({ name: quarterlyRoleName, permissions: ["ADD_REACTIONS"] })
                            .then(newRole => guildMember.addRole(newRole))
                            .catch(console.error);
                        } else {
                            guildMember.addRole(quarterlyRoleObj);
                        }
                        // reaction.then(reactionMessage => reactionMessage.remove());
                        // message.react('✅'); // checkmark
                    } catch (e) {console.error("error: " +util.inspect(e));}
                } else {
		    console.log("Bailing out - not pertinent message");
                    // message.react('🤔');
                }
                message.delete(1);
                // clear the room.
                // textChannel.bulkDelete(5);
            } catch (e) {console.error("error: " +util.inspect(e));}
        });

    } catch (e) {console.error("uncaught error caught"+ util.inspect(e));}
};

function getQuarter(d) {
  date = d || new Date();
  var month = date.getMonth() + 1;
  return "Q" + (Math.ceil(month / 3)) + "-" + date.getFullYear();
}

