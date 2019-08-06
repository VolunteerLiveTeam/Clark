// Description:
//   Track birthdays for users
//
// Dependencies:
//   "moment": "^2.10.6"
//   "node-schedule": "^0.6.0"
//
// Commands:
//   set birthday @username dd/mm - Set a date of birth for a user
//   hubot list birthdays - List all set date of births
//
// Notes:
//   Birthday greeting messages based on Steffen Opel's
//   https://github.com/github/hubot-scripts/blob/master/src/scripts/birthday.coffee
//
// Author:
//   Phill Farrugia <me@phillfarrugia.com>

const schedule = require('node-schedule');
const moment = require('moment');

module.exports = function(robot) {

  const regex = /(set birthday) (?:@?([\w .\-]+)\?*) ((0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2]))\b/i;

  // runs a cron job every day at 9:30 am
  const dailyBirthdayCheck = schedule.scheduleJob(process.env.BIRTHDAY_CRON_STRING, function() {
    let msg;
    robot.logger.debug("checking today's birthdays...");
    const birthdayUsers = findUsersBornOnDate(moment(), robot.brain.data.users);

    if (birthdayUsers.length === 1) {
      // send message for one users birthday
      msg = `@here Today is <@`+birthdayUsers[0].id`>'s birthday!`;
      msg += `\n${quote()}`;
      return robot.messageRoom(process.env.BIRTHDAY_ROOM_ID, msg);
    } else if (birthdayUsers.length > 1) {
      // send message for multiple users birthdays
      msg = "@here Today is ";
      for (let idx = 0; idx < birthdayUsers.length; idx++) {
        const user = birthdayUsers[idx];
        msg += `<@`+user.id+`>'s${idx !== (birthdayUsers.length - 1) ? " and " : ""}`;
      }
      msg += " birthday!";
      msg += `\n${quote()}`;
      return robot.messageRoom(process.env.BIRTHDAY_ROOM_ID, msg);
    }
  });

  robot.hear(regex, function(msg) {
    const name = msg.match[2];
    const date = msg.match[3];
    
    const users = robot.brain.usersForFuzzyName(name);
    if (users.length === 1) {
      const user = users[0];
      user.date_of_birth = date;
      return msg.send(`${name} is now born on ${user.date_of_birth}`);
    } else if (users.length > 1) {
      return msg.send(getAmbiguousUserText(users));
    } else {
      return msg.send(`${name}? Never heard of 'em`);
    }
  });

  robot.hear(/(?:i agree) ((0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2]))\b/i, function(res) {
    const name = res.message.user.name;
    const date = res.match[1];

    const users = robot.brain.usersForFuzzyName(name);
    if (users.length === 1) {
      const user = users[0];
      user.date_of_birth = date;
    }
  });

  robot.respond(/list birthdays/i, function(msg) {
    const { users } = robot.brain.data;
    robot.logger.debug("got birthdays!");
    if (users.length === 0) {
      return msg.send("I don't know anyone's birthday");
    } else {
      let message = "";
      for (let k in (users || {})) {
        const user = users[k];
        if (isValidBirthdate(user.date_of_birth)) {
          message += `${user.name} was born on ${user.date_of_birth}\n`;
        }
      }
      robot.logger.debug(message);
      return msg.send(message);
    }
  });

  var getAmbiguousUserText = users => `Be more specific, I know ${users.length} people named like that: ${(Array.from(users).map((user) => user.name)).join(", ")}`;

  // returns `array` of users born on a given date
  var findUsersBornOnDate = function(date, users) {
    const matches = [];
    for (let k in (users || {})) {
      const user = users[k];
      if (isValidBirthdate(user.date_of_birth)) {
        if (equalDates(date, moment(user.date_of_birth, "DD/MM"))) {
          matches.push(user);
        }
      }
    }
    return matches;
  };

  // returns `true` is date string is a valid date
  var isValidBirthdate = function(date) {
    if (date) {
      if (date.length > 0) {
        if (moment(date, "DD/MM").isValid) {
          return true;
        }
      }
    }
    return false;
  };

  // returns `true` if two dates have the same month and day of month
  var equalDates = (dayA, dayB) => (dayA.month() === dayB.month()) && (dayA.date() === dayB.date());

  const quotes = [
      "Hoping that your day will be as special as you are.",
      "Count your life by smiles, not tears. Count your age by friends, not years.",
      "May the years continue to be good to you. Happy Birthday!",
      "You're not getting older, you're getting better.",
      "May this year bring with it all the success and fulfillment your heart desires.",
      "Wishing you all the great things in life, hope this day will bring you an extra share of all that makes you happiest.",
      "Happy Birthday, and may all the wishes and dreams you dream today turn to reality.",
      "May this day bring to you all things that make you smile. Happy Birthday!",
      "Your best years are still ahead of you.",
      "Birthdays are filled with yesterday's memories, today's joys, and tomorrow's dreams.",
      "Hoping that your day will be as special as you are.",
      "You'll always be forever young.",
      "Happy Birthday, you're not getting older, you're just a little closer to death.",
      "Birthdays are good for you. Statistics show that people who have the most live the longest!",
      "I'm so glad you were born, because you brighten my life and fill it with joy.",
      "Always remember: growing old is mandatory, growing up is optional.",
      "Better to be over the hill than burried under it.",
      "You always have such fun birthdays, you should have one every year.",
      "Happy birthday to you, a person who is smart, good looking, and funny and reminds me a lot of myself.",
      "We know we're getting old when the only thing we want for our birthday is not to be reminded of it.",
      "Happy Birthday on your very special day, I hope that you don't die before you eat your cake."
  ];

  const quote = name => quotes[(Math.random() * quotes.length) >> 0];
};

