# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin provides scanning functions for the FM-DX web server.

![image](https://github.com/user-attachments/assets/7309a4de-5722-43d5-8650-8cffbb3f1037)
![image](https://github.com/user-attachments/assets/9b3401ac-1595-4f4b-a186-9f7e7c6eaead)


1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack all files from the plugins folder to ..fm-dx-webserver-main\plugins\ 
3. copy, rename and overwrite the index.js version that matches the web server: \server\index_x.x.x.js to ..fm-dx-webserver-main\server\index.js
4. Stop or close the fm-dx-webserver
5. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
6. Activate the scanner plugin in the settings
7. Stop or close the fm-dx-webserver
8. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
9. Configure your personal settings in the automatically created configPlugin.json (in the specific plugin folder!)
10. Stop or close the fm-dx-webserver
11. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations

## Configuration options:

The following variables can be changed in the configPlugin.json:

    Autoscan_PE5PVB_Mode: false,	// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware
    Search_PE5PVB_Mode: false, 	// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware
    StartAutoScan: 'off', 		// Set to "off/on/auto" (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)
    AntennaSwitch: 'off', 		// Set to "off/on" for automatic switching with more than 1 antenna at the upper band limit
	
    defaultSensitivityValue: 30, 	// Value in dBf/dBµV: 5,10,15,20,25,30,35,40,45,50,55,60 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60 | in PE5PVB_Mode: 1,5,10,15,20,25,30
    defaultScanHoldTime: 7, 	// Value in s: 1,3,5,7,10,15,20,30 
    defaultScannerMode: 'normal', 	// Only valid for Autoscan_PE5PVB_Mode = false  /  Set the startmode: "normal", "blacklist", or "whitelist"
	
	  /// LOGGER OPTIONS ////
	
    FilteredLog: true, 		// Set to "true" or "false" for filtered data logging
    RAWLog: false, 			// Set to "true" or "false" for RAW data logging
    OnlyFirstLog: false, 		// For only first seen logging, set each station found to “true” or “false”. 
    UTCtime: true, 			// Set to "true" for logging with UTC Time
    FMLIST_OM_ID: '', 		// To use the logbook function, please enter your OM ID here, for example: FMLIST_OM_ID = '1234'

## Important notes: 

- Auto Scan Mode with the options is only usable with ADMIN- oder TUNE-Athentification !!! 
- The automatic antenna switching only works if more than 1 antenna is configured in the web server !!!
- Add a white- or blacklist function: file ../plugins/Scanner/whitelist.txt or blacklist.txt must be created with the frequencies:  89.800 89.400 100.80 ... They can be written next to or below each other with space
- For ESP32 receivers (e.g. TEF6686) the plugin can uses the newly integrated firmware scan and search function. However, the prerequisite is the installation of the latest PE5PVB firmware version. 
  You can switch the plugin's scan mode using a switch (true/false) in the header of scanner_server.js
- In the header of scanner_server.js, an automatic background scan can be activated when no user is connected, or an automatic start when the web server starts
- Auto scanner and logging preferences can be configured in the scanner_server.js header
- In the HTML file you can klick on the header fields to sort the column or you enter a term in the search field
- In order to use the live stream link in the log file, you must register at fmscan.org. When you open a link for the first time, you have to authenticate yourself with it.

After activating/deactivating the plugin or making changes to the scanner server.js script, the server must be restarted!!!

## Known bugs:
- When you start the auto scanner in PE5PVB mode, the frequency freezes for a few seconds
- If the server is locked, the scanner will no longer work

## History: 

### v2.4 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- Fixed configuration is now stored in configPlugin.json
- FIRST LOG MODE now displayed in the log file

### v2.3 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- 0.01 MHz Fixed error when exceeding OIRT upper limit
- Fixed bug when crossing the date line at UTC
- The station IDs of Polish radio stations are now identified via a separate database file
- Renamed maps.fmdx.pl to maps.fmdx.org and FMDX links to MAP links
- The MAP ALL link is now created dynamically and adapts to the log filter, and there are now distance restrictions in the log file
- The refresh interval of the log file has been increased to 10 seconds
- Fixed logging and autostart for PE5PVB mode

### v2.2 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- New layout for HTML logfile with search/sort Options, Toggle Button for auto refresh and dark mode
- Time display corrected for local time
- Scan step size implemented for OIRT band
- Default selection 87.5-108 MHz if no limits are set (caused problems in previous versions!)

### v2.1 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- Mobile control for autoscan
- CSV log files (RAW + filtered) and HTML log files (RAW + filtered) can be saved automatically in /web/logs
- Time in Logfiles can be set to UTC
- HTML-Logfiles has 5 seconds autorefresh inside
- Logfiles can be download with RDS-Logger CSV- & HTML Buttons (You need RDS-Logger Plugin from v1.5) or via DX-Alert email (You need DX-Alert Plugin v. 2.0a)

### v2.0 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
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
