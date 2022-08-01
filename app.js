const { App } = require("@slack/bolt");
const config = require("dotenv").config();
const Nuxeo = require('nuxeo');
const fs = require('fs');
const path = require('path');

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode:true, // enable the following to use socket mode
    appToken: process.env.APP_TOKEN
  });

  // nuxeo app (basic auth for fast start)
var nuxeo = new Nuxeo({
auth: {
    method: 'basic',
    username: 'Administrator',
    password: 'Administrator'
}
});

app.command("/create", async ({ command, ack, say }) => {
    try {

        // Acknowledge the action
        await ack();

        const now = new Date();
        const fileDocument = {
            'entity-type': 'document',
            name: command.text + '-' +  now.toISOString(),
            type: 'File',
            properties: {
                'dc:title': command.text + '-' +  now.toISOString()
            }
        };
        let document = await nuxeo.repository()
            .create('/default-domain/workspaces/WS', fileDocument)
            .then(doc => {
                return Promise.resolve(doc);
        });

        await say(`${command.text} was created in Nuxeo ! 🎉 .`);
        await say('Direct link to the created file => ' + encodeURI(process.env.NUXEO_HOME + document.path));

    } catch (error) {
        console.error(error);
    }
});

app.command("/nxsearch", async ({ command, ack, say }) => {
    try {

        // Acknowledge the action
        await ack();

        let row = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "Documents found :",
                        "emoji": true
                    }
                }]};

        let query = "SELECT * FROM Document WHERE ecm:primaryType = 'File' and dc:title like '%" +  command.text + "%'";
        await nuxeo.repository().schemas(['dublincore', 'thumbnail', 'file']).query({query: query}).then((docs) => {
            docs.entries.forEach((doc) => {
                row.blocks.push(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": doc.title
                    },
                    "accessory": {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Direct Link Button",
                            "emoji": true
                        },
                        "value": "click_me_123",
                        "url": encodeURI(process.env.NUXEO_HOME + doc.path),
                        "action_id": "button-action"
                    }
                }
                );
            })
        });

        await say(row);

    } catch (error) {
        console.error(error);
    }
});

(async () => {
  const port = 3001
  await app.start(process.env.PORT || port);
  console.log(`⚡️ Nuxeo Slack app is running on port ${port}!`);
})();