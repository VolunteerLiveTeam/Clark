// Description:
//   Fetches snippets from the VLT wiki.
// Commands:
//   hubot snippet <snippet> - fetch snippet
//   hubot snippets - get a list of snippets
// Notes:
//   Format: a wiki page must exist at /wiki/snippets/SNIPPET_NAME/
//   The snippet's markdown must be *unescaped* inside a pair of ``` (triple backticks)
// Author:
//   @markspolakovs

module.exports = robot => {
  robot.respond(/snippets?\s?([a-zA-Z0-9/]*)$/i, res => {
    if (res.match[1].length === 0) {
      // Index of snippets
      robot.http("https://www.reddit.com/r/VolunteerLiveTeam/wiki/pages.json")
      .header("Accept", "application/json")
      .get()((err, response, body) => {
        if (err) {
          res.send(`Encountered an error: ${err}`);
          return;
        }
        if (response.statusCode !== 200) {
            res.send(`Reddit API came back ${response.statusCode}`);
          return;
        }
        const data = JSON.parse(body);
        const snippets = data.data.filter(x => x.startsWith("snippets/"));
        const msg = `Available snippets (use \`clippy snippet <snippet>\` to open):
${snippets.map(x => x.substr("snippets/".length)).map(x => " * " + x).join("\n")}`;
        res.send(msg);
      });
      return;
    }
    robot
      .http(
        `https://old.reddit.com/r/VolunteerLiveTeam/wiki/snippets/${
          res.match[1]
        }.json`
      )
      .header("Accept", "application/json")
      .get()((err, response, body) => {
      if (err) {
        res.send(`Encountered an error: ${err}`);
        return;
      }
      if (response.statusCode !== 200) {
        if (response.statusCode === 404) {
          res.send(`Snippet \`${res.match[1]}\` does not exist!`);
        } else {
          res.send(`Reddit API came back ${response.statusCode}`);
        }
        return;
      }
      const data = JSON.parse(body);
      const markdown = data.data.content_md;
      const snippet = markdown.match(/```\s*([\s\S]+)\s*```/m)[1];

      res.send("```\n" + snippet + "\n```");
    });
  });
};
