import express from 'express';
import { MongoClient } from "mongodb";
import cors from "cors";
import bodyparser from "body-parser";
// import * as path from "path";
import dotenv from "dotenv";
import mailjet from "node-mailjet"


dotenv.config();

/*
  MongoDB Setup
*/
const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function run() {
  try {
    await client.connect();
    db = client.db("quizaroni")
  }
  finally {
    await client.close();
  }

}
run().catch(console.dir);

/* 
SMTP Server Code
*/
const mailjetObj = mailjet.connect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);


/* 
REST API Code
*/

const API = express();
API.use(cors());
API.use(bodyparser.json());

const PORT = process.env.PORT || 5000;

API.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
});

API.get("/api", (req, res) => {
  res.send("Yo whats up")
})

API.get('/express_backend', (req, res) => {
  res.send("<p>Hello yo</p>");

  // res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

API.post("/send_email", async (req, res) => {
  // console.log("request object = ", req);
  const { to, subject, text } = req.body
  console.log("Testing email API route")
  console.log({to, subject, text});

  // const content = {
  //   to: '',
  //   from: email,
  //   subject: `New Message From - ${email}`,
  //   text: message,
  //   html: `<p>${message}</p>`
  // }
  mailjetObj
    .post("send", { 'version': 'v3.1' })
    .request({
      "Messages": [
        {
          "From": {
            "Email": process.env.EMAIL_USERNAME,
            "Name": "Quizaroni"
          },
          "To": [
            {
              "Email": "quizaroni.app@gmail.com",
              "Name": "Quizaroni"
            }
          ],
          "Subject": "Greetings from Mailjet.",
          "TextPart": "My first Mailjet email",
          "HTMLPart": "<h3>Hey, welcome to Quizaroni!</h3><br />Lets cook up some study resources!",
          "CustomID": "QuizaroniTest"
        }
      ]
    })
  request
    .then((result) => {
      console.log(result.body);
      res.json({ status: "OK" });
    })
    .catch((err) => {
      console.log(err.statusCode)
    })
})

export const handler = API;