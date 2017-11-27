import { File } from '../models/File';

const clientSockets = new Map();


/**
 * GET /socket
 * Creates a web socket connection between server and client
 */
export const acceptWebSocketConnection = async (ws, req) => {
  const { clientId } = req;

  if(clientSockets.get(clientId)) {
    return ws.send(JSON.stringify({ok: false, message: `You have already created a socket connection here`}));
  }

  // Shouldn't be receiving any messages from client, only for us to communicate back to them
  ws.on('message', message => {
    console.log(`Received: ${message}`);
  });

  ws.on('error', error => {
    console.error(error);
  });

  ws.on('close', () => {
    clientSockets.delete(clientId);
  });

  clientSockets.set(clientId, ws);
};



/**
 * GET /subscribe/:_id
 * Subscribes a client to a file
 */
export const subscribe = async (req, res) => {
  const { clientId } = req;
  const { _id } = req.params;

  // Save the clients socket
  if(!clientSockets.get(clientId)) {
    console.log(`Client ${clientId} requested a subscription without a socket`);
    return res.status(400).send({message: `You must have an open socket connection before subscribing to a file`});
  }

  // Update our file to include the new subscriber
  let file = await File.findOne({_id});

  if(!file) {
    console.log(`Making record of new file ${_id}`);
    file = new File({_id})
  }

  // Could cause problems with multiple subscriptions
  file.subscribedClients.push({_id: clientId,});

  try {
    await file.save();
    res.send({message: `${clientId} has been successfully subscribed to ${_id}`});
  } catch (err) {
    console.error(`Error saving a cache entry for ${_id}`);
    res.status(500).send({message: `Error saving a cache entry for ${_id}`});
  }
};


/**
 * GET /unsubscribe/:_id
 * Unsubscribes a client to a file
 */
export const unsubscribe = async (req, res) => {
  const { clientId } = req;
  const { _id } = req.params;

  clientSockets.get(clientId).terminate();

  const file = await File.findOne({_id});

  if(!file) {
    console.log(`File ${_id} has no subscribers`);
    return res.status(404).send({message: `File ${_id} has no subscribers`})
  }

  file.subscribedClients.id(clientId).remove();

  try {
    await file.save();
    res.send({message: `${clientId} has been successfully unsubscribed from ${_id}`});
  } catch (err) {
    console.error(`Error saving a cache entry for ${_id}`);
    res.status(500).send({message: `Error saving a cache entry for ${_id}`});
  }
};


/**
 * PUT /notify/:_id
 * body: {version}
 * Notifies cache server that a file has been updated
 */
export const notifyOfUpdate = async (req, res) => {
  const { version } = req.body;
  const { _id } = req.params;

  const file = await File.findOne({_id});

  if(!file) {
    console.log(`File ${_id} was updated but we have no record of it`);
    return res.send({message: 'Uh, thanks but I have no subscribers for that file..'});
  }

  console.log(file.subscribedClients);

  file.version = version;
  invalidateClientCaches(_id, file.subscribedClients, version);


  try {
    await file.save();
    res.send({message: `Updated ${_id} to version ${version}, notifying clients`});
  } catch (err) {
    console.error(`Error updating a cache entry for ${_id} to version ${version}`);
    res.status(500).send({message: `Error updating a cache entry for ${_id} to version ${version}`});
  }
};


function invalidateClientCaches(_id, subscribedClients, version) {
  console.log(`Invalidating caches for file ${_id}`);
  subscribedClients.forEach(client => {
    const ws = clientSockets.get(client._id.toString());
    if(ws) {
      console.log(`Telling ${client._id} to invalidate cache`);
      ws.send(JSON.stringify({message: `Version ${version} is now available`, _id}));
    }
  });
}