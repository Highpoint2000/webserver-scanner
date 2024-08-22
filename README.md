# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin provides scanning functions for the FM-DX web server.

![image](https://github.com/user-attachments/assets/7309a4de-5722-43d5-8650-8cffbb3f1037)



### v2.1 BETA (Logger Version - only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- Mobile control for autoscan
- CSV log files (RAW + filtered) and HTML log files (RAW + filtered) can be saved automatically in /web/logs
- Time in Logfiles can be set to UTC
- HTML-Logfiles has 5 seconds autorefresh inside
- Logfiles can be download with RDS-Logger CSV- & HTML Buttons (You need RDS-Logger Plugin from v1.5) or via DX-Alert email (You need DX-Alert Plugin v. 2.0a)


## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack all files from the plugins folder to ..fm-dx-webserver-main\plugins\ 
3. copy, rename and overwrite the index.js version that matches the web server: \server\index_x.x.x.js to ..fm-dx-webserver-main\server\index.js
4. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
5. Activate the scanner plugin in the settings

## Important notes: 

- Auto Scan Mode with the options is only usable with ADMIN- oder TUNE-Athentification !!! 
- The automatic antenna switching only works if more than 1 antenna is configured in the web server !!!
- Add a white- or blacklist function: file ../plugins/Scanner/whitelist.txt or blacklist.txt must be created with the frequencies:  89.800 89.400 100.80 ... They can be written next to or below each other with space
- For ESP32 receivers (e.g. TEF6686) the plugin can uses the newly integrated firmware scan and search function. However, the prerequisite is the installation of the latest PE5PVB firmware version. 
  You can switch the plugin's scan mode using a switch (true/false) in the header of scanner_server.js
- In the header of scanner_server.js, an automatic background scan can be activated when no user is connected, or an automatic start when the web server starts
- Auto scanner and logging preferences can be configured in the scanner_server.js header
- After activating/deactivating the plugin or making changes to the scanner server.js script, the server must be restarted!!!

## Known bugs:
- When you start the auto scanner in PE5PVB mode, the frequency freezes for a few seconds
- If the server is locked, the scanner will no longer work

## History: 

### v2.0 SERVER BASED VERSION (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- Automatic background scan when no user is connected or automatic start when the web server is started
- Automatic antenna switching on upper band limit
- Hide the control buttons when autoscan mode is active (blinking information!)
- Activating the scanner control function is done by holding down the auto scan buttons
- blacklist.txt and whitlist.txt are now loaded from the plugin path
- Server plugins are activated/deactivated via the web server GUI
- Proxy Server ready (Tnx to _zer0_gravity_)

### v1.3e (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- compatible with changed websocket data in version 1.2.6
- Increase scan and search speed

### v1.3d (only works from web server version 1.2.3 - older versions must take the plugin version 1.3c !!!)
- Problem with multiple connections (user online) fixed

### v1.3c
- Fixed a bug due to missing band limits
- Autoscan mode button is visible again without login

### v1.3b
- optimze scan performance
- longer RDS detection if PI-code detected

### v1.3a
- optimze the blacklist processing
- Add a white list function (file /web/scanner/whitelist.txt must be created with the frequencies:  89.800 89.400 100.80 ... They can be written next to or below each other with spaces)
- separate software switches for auto scan and search mode << >> (Mixed Mode with PE5PVB Firmware) 

### v1.3
- Added Auto Scan Mode for ALL Devices including settings (blacklist on/off, sensivity, scan hold time). To do this, set the query off PE5PVB Firmware in the header of the script to 'false'.
- Default values ​​for mode, sensitivity and scan hold time can be set in the script
- blacklist on/off and sensivity have affect the manual search mode << >>
- To use the blacklist option, a file /web/scanner/blacklist.txt must be created  (For example, the frequencies that should not be logged must be: 89.800 89.400 100.80 ... They can be written next to or below each other with spaces)

### v1.2
- Added Scan Sensitivity and Scanhold Time settings
- Design issues fixed

### v1.1
- Add a Auto Scan Mode for ESP32 receiver (Newewst PE5PVB ESP32 firmware (RC-Version) required!)
- Merging the functionalities of v1.0 and v1.0a (Switching in JS-Code)

### v1.0a
- Direct use of the integrated scan function of the ESP32 receiver (PE5PVB ESP32 firmware required!)
- Fixed issue with incorrect number of users

### v1.0
- Plugin scan function 
