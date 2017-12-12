# Distributed File System: Cachine Service
This repo contains the code for the caching service for my distributed file system. Links to all components of my file system can be found in the repo for the [test client and client library](https://github.com/stefano-lupo/DFS-Client)

## Encryption / Authentication
All client requests are behind a piece of middleware which examines the supplied token, attempts to decrypt it using the server key (known to all server nodes) and verify its contents. This middleware also sets the `clientId` (contained in the encrypted token) field of an incoming request (if it could be authenticated), allowing the controllers to know which client they are servicing. Finally, it also sets `req.decrypted` with the decrypted contents of the body of any POST requests.


## The Caching Service
The caching service is the code responsible for ensuring that all clients' files are up to date. It keeps a mongo db collection of Files which simply contain an `_id`, `version` and an array of `subscribedClients` (clients who are subscribed to this file). The caching service is informed by the master file system node when an update has occured on a certain file. The caching service can then look up this file and find the `_id` of each of the clients who are subscribed to this file and invalidate their cached copies of the file.

### Callback Approach using WebSockets
In order to implement a callback solution to the above problem (that is one where the client's are informed by the caching service when a file has been updated) instead of a polling solution (where the clients must ask the caching service if the file is still up to date), websockets were used, specifically [express-ws](https://github.com/HenningM/express-ws). 

One of the first things done by the client library is to establish a connection with the caching service. This initial request is done over HTTP and is subsequently upgraded to a web socket connection. This allows the caching service to send messages directly to the client in real time over a long lasting connection.

In order to accomplish this, the caching service maintains an in-memory map from client `_id` -> `webSocketInstance`. Thus when a list of clients need to be informed to invalidate their local cache for a certain file, the caching service can retrieve the socket connection associated with this client and inform them appropriately. 

## Client API
#### `ws://<caching_service>/socket`
- This opens up a websocket connection between the client and the caching service.
- This connection is long lasting and thus can be used to transmit messages to the client as required.

#### `GET /subscribe/:_id`
- Subscribes a client to a file `_id`.
- Any updates to file `_id` will result in the caching service informing the client to invalidate their cached copy of `_id`

#### `DELETE /subscribe/:_id`
- Unsubscribes a client to file `_id`
- The client will no longer be informed of any updates to file `_id`


## Inter Service API
#### `PUT /notify/:_id`
- **body**
  - `version`: the current version of file `_id`
- This informs the caching service that file `_id` has been updated.
- At this point the caching service can proceed to invalidate the caches of all clients subscribed to file `_id`.
