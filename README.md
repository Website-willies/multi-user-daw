# multi-user-daw
Subject to modification: multi-user daw, allowing for multiple clients to connect and place sounds on a midi-like timeline.

# dev
Run npm setup-db to create initial database and run all migrations for schema configuration.
Run npm seed to init sounds db with wav files in /src/sounds.
Temp get endpoint /sounds that lists all files in sounds db to check for correct setup.


# Week 6
Developments for this week:
General idea - Each time the client draws a note to the canvas, a post request is sent to the server in json containing the sound, the pitch, and the timestep. 

On the server side, the json data is unpacked and the information (sound, pitch, timestep) is stored into the sounds database unique database.

id | uuid | sound | pitch | time
--------------------------------
1  |1     |kick   |1      |1   

On the client side, when the user requests to play the song back, a request is made to the server to get all of the sounds in the users database, and these sounds are then sent to the client.

Kaleb - The canvas on the client side, each time user draws box a post request is sent to server with json of information.

Elias - Store json info into user database, create endpoint for when user requests all sounds at once, display sounds on client for now.

Liam - Implement way to play a series of sounds from a list of jsons.



