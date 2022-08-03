const { App } = require("@slack/bolt");
const config = require("dotenv").config();
const Nuxeo = require('nuxeo');

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode:true, // enable the following to use socket mode
    appToken: process.env.APP_TOKEN
  });

  // nuxeo app (basic auth for fast start and no need to deploy anywhere else)
var nuxeo = new Nuxeo({
auth: {
    method: 'basic',
    username: process.env.NUXEO_USER,
    password: process.env.NUXEO_PASSWORD
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
            .create(process.env.NUXEO_DEFAULT_WS, fileDocument)
            .then(doc => {
                return Promise.resolve(doc);
            }).catch(err => {
                console.error(error);
            });

            if (document){
                await say(`${command.text} was created in Nuxeo ! 🎉 .`);
                await say('Direct link to the created file => ' + encodeURI(process.env.NUXEO_HOME + document.path));
            } else {
                await say("Sorry, something went wrong.");
            }
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

        let query = "SELECT * FROM Document WHERE ecm:primaryType = 'File' and ecm:fulltext = '" +  command.text + "'";
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