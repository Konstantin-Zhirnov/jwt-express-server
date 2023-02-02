require('dotenv').config()
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const router = require('./router/index');
const errorMiddleware = require('./middleware/error-middleware');

const PORT = process.env.PORT || 80;
const app = express();

app.use(express.json());
app.use(cookieParser());

const whitelist = ['https://mellifluous-lily-395be2.netlify.app/', 'http://localhost:3000', ];
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if(whitelist.includes(origin))
      return callback(null, true)
    callback(new Error('Not allowed by CORS'));
  }
}
app.use(cors(corsOptions));
const allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,token');
  next();
}
app.use(allowCrossDomain);

app.use('/api', router);
app.use(errorMiddleware);


const start = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(() => {
        console.log('Connected to DB!');
      }).catch((err) => {
        console.log(err.message);
      });

    app.listen(PORT, () => console.log(`Server started on PORT = ${PORT}`));
  } catch (e) {
    console.log(e);
  }
}

start();
