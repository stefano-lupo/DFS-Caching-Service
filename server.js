import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import moment from 'moment';
import expressWs from 'express-ws';
import dotenv from 'dotenv';
dotenv.config();

// Import Controllers
import * as CachingController from './controllers/CachingController';

// Create Server
const app = express();
expressWs(app);
app.use(bodyParser.urlencoded({extended: true}));   // Parses application/x-www-form-urlencoded for req.body
app.use(bodyParser.json());                         // Parses application/json for req.body
app.use(morgan('dev'));


// Make encryption parameters accessible
const encryption = {
  algorithm: process.env.SYMMETRIC_ENCRYPTION,
  plainEncoding: process.env.PLAIN_ENCODING,
  encryptedEncoding: process.env.ENCRYPTED_ENCODING,
  serverKey: process.env.SERVER_KEY
};


// Initialize the DB
const dbURL = "mongodb://localhost/dfs_cachingService";
mongoose.connect(dbURL);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to Database");
});



// TODO: Add heartbeat stuff - need wss (https://github.com/websockets/ws#how-to-detect-and-close-broken-connections)


// Middleware to authenticate / decrypt incoming requests
const authenticator = (req, res, next) => {

  // Ensure auth ticket exists
  const { authorization } = req.headers;
  if(!authorization) {
    console.log(`No auth key provided`);
    return res.status(401).send({message: `No authorization key provided`});
  }

  try {
    // Decrypt auth ticket with server's private key
    const ticket = decrypt(authorization);

    // Parse the ticket from the decrypted string
    let { _id, expires, sessionKey } = JSON.parse(ticket);
    expires = moment(expires);


    // Ensure the ticket is in date
    if(moment().isAfter(expires)) {
      console.log(`Ticket expired on ${expires.format()}`);
      return res.status(401).send({message: `Authorization token expired on ${expires.format()}`});
    }

    // Pass the controllers the decrypted body and the client's _id
    req.clientId = _id;
    if(req.body.encrypted) {
      req.decrypted = JSON.parse(decrypt(req.body.encrypted, sessionKey));
    }
  }

    // If JSON couldn't be parsed, the token was invalid
  catch(err) {
    console.error(err);
    return res.status(401).send({message: `Invalid authorization key provided`})
  }

  next()
};


// Endpoints for Inter service communication
app.put('/notify/:_id', CachingController.notifyOfUpdate);

app.use(authenticator);


// Endpoints for clients
app.ws('/socket', CachingController.acceptWebSocketConnection);
app.get('/subscribe/:_id', CachingController.subscribe);
app.delete('/subscribe/:_id', CachingController.unsubscribe);




// Initialize the Server
app.listen(3004, function() {
  console.log('Caching Service on port 3004');
});


/**
 * Decrypts the data using parameters defined in .env file
 * @param data to be decrypted
 * @param key used during the encryption
 */
function decrypt(data, key=encryption.serverKey) {
  const { algorithm, plainEncoding, encryptedEncoding } = encryption;

  const decipher = crypto.createDecipher(algorithm, key);
  let deciphered = decipher.update(data, encryptedEncoding, plainEncoding);
  deciphered += decipher.final(plainEncoding);

  return deciphered
}
