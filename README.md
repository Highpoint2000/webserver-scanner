# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)
![image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/548c8bac-1cc0-4c25-8272-fc039b495d4e)


### v1.3 BETA:
- Added Auto Scan Mode for ALL Devices including settings (blacklist on/off, sensivity, scan hold time)
  ---> To do this, set the query off PE5PVB Firmware in the header of the script to 'false'!

## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack the Scanner.js and the Scanner Logo folder with the scanner-plugin.js into the web server plugins folder (..fm-dx-webserver-main\plugins) 
[image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/15e5d4eb-eb09-4466-972b-20a569737cf0)
3. Restart the server
4. Activate the plugin it in the settings

This plugin provides scanning functions for the FM-DX web server.

## Important notes: 

For ESP32 receivers (e.g. TEF6686) the plugin can uses the newly integrated firmware scan function. However, the prerequisite is the installation of the latest PE5PVB firmware version. You can switch the plugin's scan mode using a switch (true/false) in the plugin's source code. 

## Known bugs:
- Currently, no status updates on the status of the scanner can be retrieved from the receiver. The reload of the website starts with Auto Scan off. 
- There are problems when using upstream proxy servers and NON-TEF receivers

## History: 

### v1.2:
- Added Scan Sensitivity and Scanhold Time settings
- Design issues fixed

### v1.1:
- Add a Auto Scan Mode for ESP32 receiver (Newewst PE5PVB ESP32 firmware (RC-Version) required!)
- Merging the functionalities of v1.0 and v1.0a (Switching in JS-Code)

### v1.0a:
- Direct use of the integrated scan function of the ESP32 receiver (PE5PVB ESP32 firmware required!)
- Fixed issue with incorrect number of users

### v1.0:
- Plugin scan function 
