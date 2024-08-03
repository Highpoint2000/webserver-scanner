# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin provides scanning functions for the FM-DX web server.

![image](https://github.com/user-attachments/assets/5d87fc30-20cc-4778-8e07-7c46bd02e48b)


### v1.3e (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- compatible with changed websocket data in version 1.2.6
- Increase scan and search speed

NOTE: If you use the logger plugin, please update it to at least version [1.3e or 1.3d ](https://github.com/Highpoint2000/webserver-logger/releases)!

## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack the Scanner.js and the Scanner folder with the scanner-plugin.js into the web server plugins folder (..fm-dx-webserver-main\plugins) 
[image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/15e5d4eb-eb09-4466-972b-20a569737cf0)
3. Restart the server
4. Activate the plugin it in the settings

## Important notes: 

- Auto Scan Mode with the options is only usable with ADMIN- oder TUNE-Athentification! 
- Only one browser instance is allowed to carry out the scan!
- Add a white- or blacklist function: file /web/scanner/whitelist.txt or blacklist.txt must be created with the frequencies:  89.800 89.400 100.80 ... They can be written next to or below each other with space
- For ESP32 receivers (e.g. TEF6686) the plugin can uses the newly integrated firmware scan function. However, the prerequisite is the installation of the latest PE5PVB firmware version. You can switch the plugin's scan mode using a switch (true/false) in the plugin's source code. 

## Known bugs:
- Currently, no status updates on the status of the scanner can be retrieved from the receiver. The reload of the website starts with Auto Scan off. 

## History: 

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
