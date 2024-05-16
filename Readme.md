# WHATIS

```bash
https://meshtastic.taubetele.com/
```

A nearly live map of Meshtastic nodes seen by Meshtastic MQTT servers.

Before start it, run redis docker container + back (api.meshtastic.taubetele.com) + mqtt server (optional).



## Task list

- [x] Show node's on the map
- [x] Diveces data list
    - [x] Search
    - [x] Button > modal window > readeble table
    - [ ] Beautify (people readeble table)
- [x] Telegram bot forwards public messages
    - [ ] add some reciver
- [x] Show MQTT connected node's
- [x] Show points in the window only, do not draw unnecessary
- [x] Background update by timer 20s
- [ ] Telemetry charts
	- [x] collect telemetry data
	- [x] returns data on request
- [ ] GPS track by node
	- [x] collect location data
	- [x] returns data on request
- [ ] Show real connections between nodes, layer with switch (based on user pings)
- [ ] Switch to simplified data
- [ ] Remember the last position of map in window
- [ ] Dark themes

## Contributors list

- @kkwestt
- @zwoelf
- Vadim Kudr
- @JulesSoulfly
- @AnastasiiaRyabchikova
