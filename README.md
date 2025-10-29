# multi-user-daw
Subject to modification: multi-user daw, allowing for multiple clients to connect and place sounds on a midi-like timeline.

# dev
Run npm setup-db to create initial database and run all migrations for schema configuration.
Run npm seed to init sounds db with wav files in /src/sounds.
Temp get endpoint /sounds that lists all files in sounds db to check for correct setup.