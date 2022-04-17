import express from 'express';
import { MongoClient } from "mongodb";
import cors from "cors";
import bodyparser from "body-parser";
// import * as path from "path";
import * as nodemailer from "nodemailer";
import dotenv from "dotenv";
import {MailService} from '@sendgrid/mail';


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

// transporter object for Gmail account
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});


/* 
REST API Code
*/

const api_app = express();
api_app.use(cors());
api_app.use(bodyparser.json());

const PORT = process.env.PORT || 5000;

api_app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
});

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
  
  const content = {
    to: '',
    from: email,
    subject: `New Message From - ${email}`,
    text: message,
    html: `<p>${message}</p>`
  }


  // res.json()
  res.json({ status: "OK" });
})

export const handler = api_app;