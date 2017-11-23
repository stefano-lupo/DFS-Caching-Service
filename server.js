import express from 'express';
// import mongoose from 'mongoose';


import bodyParser from 'body-parser';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';

// Import Controllers
import CacheController from './controllers/CacheController';

const app = express();

// Initialize .env
require('dotenv').config();


// Initialize the DB
// const dbURL = "mongodb://localhost/dfs_filesystem";
// mongoose.connect(dbURL);
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
//   console.log("Connected to Database");
// });



app.use(bodyParser.urlencoded({extended: true}));   // Parses application/x-www-form-urlencoded for req.body
app.use(bodyParser.json());                         // Parses application/json for req.body
app.use(morgan('dev'));


// expose environment variables to app
// app.set('jwt', {secret: process.env.JWT_SECRET, expiry: process.env.JWT_EXPIRY});

// Initialize the Server
app.listen(3002, function() {
  console.log('Locking Server on port 3002');
});
