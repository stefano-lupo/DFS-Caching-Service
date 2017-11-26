import { File } from '../models/File';

/**
 * GET /subscribe/:_id
 * Subscribes a client to a file
 */
export const subscribe = async (req, res) => {
  const { clientId, ip } = req;
  const { _id } = req.params;

  let file = await File.findOne({_id});

  if(!file) {
    file = new File({_id})
  }

  // Could cause problems with multiple subscriptions
  file.subscribedClients.push({_id: clientId, ip});

  try {
    await file.save();
    res.send({message: `${clientId} has been successfully subscribed to ${_id}`});
  } catch (err) {
    console.error(`Error saving a cache entry for ${_id}`);
    res.status(500).send({message: `Error saving a cache entry for ${_id}`});
  }
};


/**
 * GET /subscribe/:_id
 * Subscribes a client to a file
 */
export const unsubscribe = async (req, res) => {
  const { clientId } = req;
  const { _id } = req.params;

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
    console.log("no file");
    return res.send({message: 'Uh, thanks but I have no subscribers for that file..'});
  }

  console.log(file.subscribedClients);

  file.version = version;
  file.subscribedClients.forEach(client => {
    notifyClientOfUpdate(client.ip, _id, version);
  });



  try {
    await file.save();
    res.send({message: `Updated ${_id} to version ${version}, notifying clients`});
  } catch (err) {
    console.error(`Error updating a cache entry for ${_id} to version ${version}`);
    res.status(500).send({message: `Error updating a cache entry for ${_id} to version ${version}`});
  }
};



function notifyClientOfUpdate(ip, _id, version) {
  console.log(`Notifying client ${ip}`);
}


export const getSubscribedClients = async (req, res) => {
  const { _id } = req.params;
  const file = await File.findOne({_id});
  res.send(file);
};