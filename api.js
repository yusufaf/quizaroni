import express from 'express';

const app = express()

const port = process.env.PORT || 5000;


// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

app.get('/express_backend', (req, res) => {
    res.send("<p>Hello</p>");

    // res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
  });

export const handler = app;