    // server.js

    require('dotenv').config({ path: 'variables.env' });
    const express = require('express');
    const cors = require('cors');

    const poll = [
      {
        name: 'Chelsea',
        votes: 100,
      },
      {
        name: 'Arsenal',
        votes: 70,
      },
      {
        name: 'Liverpool',
        votes: 250,
      },
      {
        name: 'Manchester City',
        votes: 689,
      },
      {
        name: 'Manchester United',
        votes: 150,
      },
    ];

    const app = express();
    app.use(cors());

    app.get('/poll', (req, res) => {
      res.json(poll);
    });

    app.set('port', process.env.PORT || 4000);
    const server = app.listen(app.get('port'), () => {
      console.log(`Express running → PORT ${server.address().port}`);
    });