require('dotenv').config();
var express = require('express')
var { encoding_for_model } = require("tiktoken");
var { OpenAI } = require('openai')

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/request", async (req, res) => {
    console.log("Received")
    try {
        const parentId = req.body.parentId;
        const prompt = req.body.prompt;
        const userToken = req.body.userToken;
        console.log(req.body);
        console.log(req.body.key1)
        const completionStream = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            //messages: [{ role: "user", content: message }],
            messages: [{ role: "user", content: "Hi" }],
            stream: true,
            max_tokens: 4096,
        });
        for await (const part of completionStream) {
            res.write(part.choices[0]?.delta?.content || "");
        }
        res.end();
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error. Please resend the request.");
    }
});

var server = app.listen(8080, "0.0.0.0", () => {
    var host = server.address().address
    var port = server.address().port
    console.log("App listening at http://%s:%s", host, port)
});
