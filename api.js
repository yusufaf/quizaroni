import express from 'express';
import cors from "cors";
import bodyparser from "body-parser";
// import * as path from "path";
import * as nodemailer from "nodemailer";
import * as smtpserver from "smtp-server";
import dotenv from "dotenv";

dotenv.config()

/* 
SMTP Server Code
*/

console.log({ name: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD });

// transporter object for Gmail account
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

const smtp_server = new smtpserver.SMTPServer({
  name: "Quizaroni SMTP",
  // onData -- callback to handle incoming messages
  onData(stream, session, callback) {
    parser(stream, {}, (err, parsed) => {
      if (err)
        // console.log("Error:", err)

        // console.log(parsed)
        stream.on("end", callback)
    })

  },
  disabledCommands: ['AUTH']
});

smtp_server.listen(465);


// app.use(cors()) 
// app.use(bodyparser.json()) 

/* 
REST API Code
*/

const api_app = express();
api_app.use(cors());
api_app.use(bodyparser.json());

const port = process.env.PORT || 5000;

// console.log that your server is up and running
api_app.listen(port, () => console.log(`Listening on port ${port}`));

api_app.get("/api", (req, res) => {
  res.send("Yo whats up")
})

api_app.get('/express_backend', (req, res) => {
  res.send("<p>Hello yo</p>");

  // res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

api_app.post("/send_email", async (req, res) => {
  // console.log("request object = ", req);
  const { to, subject, text } = req.body
  console.log("Testing email API route")

  await transporter.sendMail({
    from: process.env.EMAIL_USERNAME,
    to,
    subject,
    text,
  })
  .catch(err => {
    console.log("err = ", err);
  })
  // res.json()
  res.json({status: "OK"});
})

export const handler = api_app;