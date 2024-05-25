require('dotenv').config();
var cors = require('cors');
var express = require('express');
var session = require('express-session')
var monk = require('monk');
var { OpenAI } = require('openai');
var { encodingForModel } = require("js-tiktoken");

const db = monk(process.env.MONGO_URI);
const collection = db.get("chat_history");
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const app = express();
const enc = encodingForModel("gpt-4o");

app.use(cors({credentials: true, origin: ['http://127.0.0.1:3000']}));
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'never_gonna_give_you_up',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
    }
}));

app.get("/oauth2/login", (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=identify`);
});

app.get("/oauth2/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.redirect("http://127.0.0.1:3000");
    }
    try {
        const token = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: process.env.REDIRECT_URI,
                scope: "identify",
            }),
        })
        const json = await token.json();
        console.log(json);
        const data = await fetch(`https://discord.com/api/users/@me`, {headers: { Authorization: `Bearer ${json.access_token}` } });
        const user = await data.json();
        console.log(user.id);
        req.session.user = user.id;
        req.session.username = user.username;
        res.redirect("http://127.0.0.1:3000");
    }
    catch (error) {
        console.error(error);
    }

})

app.post("/api/request", async (req, res) => {
    console.log("Received");
    console.log(req.session.user);
    console.log(req.body.chatId);
    const chatId = req.body.chatId;
    let inputPrompt = req.body.prompt;
    let backupPrompt = JSON.parse(JSON.stringify(inputPrompt));
    let res_msg = "";
    let req_token = 0;
    for (let i = inputPrompt.length - 1; i >= 0; i--) {
        if (inputPrompt[i].role === "user") { req_token += enc.encode(inputPrompt[i].content[0].text).length; }
        else { req_token += enc.encode(inputPrompt[i].content).length; }
        if (req_token >= parseInt(process.env.PROMPT_MAX_TOKEN)) {
            inputPrompt = inputPrompt.slice(i, inputPrompt.length);
            break;
        }
    }
    try {
        const completionStream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: inputPrompt,
            //messages: [{ role: "user", content: "Hi" }],
            stream: true,
            max_tokens: 1000,
        });
        for await (const part of completionStream) {
            let temp = part.choices[0]?.delta?.content || "";
            res_msg += temp;
            res.write(temp);
            //res.write(part.choices[0]?.delta?.content || "");
        }
        res.end();
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error. Please resend the request.");
    }
    if (chatId !== "") {
        const outputPrompt = backupPrompt.concat([{ role: "assistant", content: res_msg }]);
        try {
            await collection.update({_id: chatId}, { $set: { messages: outputPrompt, modified: Date.now(), title: outputPrompt[0].content[0].text} });
        }
        catch (error) {
            console.log("Failed to write to db");
        }
    }
});

app.get("/username", async (req, res) => {
    res.send(req.session.username);
})

app.get("/history", async (req, res) => {
    if (req.session.user) {
        try {
            let output = [];
            let docs = await collection.find({ userId: req.session.user }, {sort: {modified: -1}});
            for (i of docs) {
                output.push({ id: i._id, title: i.title });
            }
            res.json(output);
        }
        catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error. Please resend the request.");
        }
        return;
    }
    res.json([]);
})

app.get("/new_chat", async (req, res) => {
    if (req.session.user) {
        try {
            let doc = await collection.insert({ userId: req.session.user, title: "Untitled", messages: [], modified: Date.now() });
            res.json({ id: doc._id });
        }
        catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error. Please resend the request.");
        }
        return;
    }
    res.json({ id: "" });
})

app.get("/history", async (req, res) => {
    if (req.session.user) {
        try {
            let output = [];
            let docs = await collection.find({ userId: req.session.user }, {sort: {modified: -1}});
            for (i of docs) {
                output.push({ id: i._id, title: i.title });
            }
            res.json(output);
        }
        catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error. Please resend the request.");
        }
        return;
    }
    res.json({});
})

app.get("/conversation/:id", async (req, res) => {
    if (req.session.user) {
        let noteid = req.params.id;
        try {
            let doc = await collection.findOne({ _id: noteid, userId: req.session.user });
            if (doc) {
                res.json(doc);
            }
            else {
                res.status(404).send("Not Found");
            }
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error. Please resend the request.");
        };
    }
    else {
        res.status(403).send("Forbidden");
    }
})

app.delete("/conversation/:id", async (req, res) => {
    if (req.session.user) {
        let noteid = req.params.id;
        try {
            let doc = await collection.findOne({ _id: noteid, userId: req.session.user });
            if (doc) {
                let result = await collection.remove({ _id: noteid, userId: req.session.user });
                res.status(200).send("Deleted");
            }
            else {
                res.status(404).send("Not Found");
            }
        }
        catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error. Please resend the request.");
        };
    }
    else {
        res.status(403).send("Forbidden");
    }
})

var server = app.listen(8080, "0.0.0.0", () => {
    var host = server.address().address
    var port = server.address().port
    console.log("App listening at http://%s:%s", host, port)
});
