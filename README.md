# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)
![image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/c983c83d-e08a-417d-a067-f76d4cedb2eb)



## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack the Scanner.js and the Scanner Logo folder with the scanner-plugin.js into the web server plugins folder (..fm-dx-webserver-main\plugins) 
[image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/15e5d4eb-eb09-4466-972b-20a569737cf0)
3. Restart the server
4. Activate the plugin it in the settings

This plugin provides scanning functions for the FM-DX web server.

## Important notes: 

For ESP32 receivers (e.g. TEF6686) the plugin uses the newly integrated scan function. However, the prerequisite is the installation of the latest firmware version (RC version). The mode can be started, stopped and the scan sensitivity and scan hold time can be adjusted using the auto scan button. For all receiver types there is also a scan control available using the left/right buttons, which stops at the next RDS station.

 If your ESP32 receiver is not running a suitable firmware version or you are using a different type of receiver, you can switch the plugin's scan mode using a switch (true/false) in the plugin's source code. However, the Auto Scan mode with the sensitivity and scanhold settings are then not available.

## Known bugs:
- Currently, no status updates on the status of the scanner can be retrieved from the receiver. The reload of the website starts with Auto Scan off. 
- There are problems when using upstream proxy servers and NON-TEF receivers

## Current version: 

### v1.2:
- Added Scan Sensitivity and Scanhold Time settings

## History: 

### v1.1:
- Add a Auto Scan Mode for ESP32 receiver (Newewst PE5PVB ESP32 firmware (RC-Version) required!)
- Merging the functionalities of v1.0 and v1.0a (Switching in JS-Code)

### v1.0a:
- Direct use of the integrated scan function of the ESP32 receiver (PE5PVB ESP32 firmware required!)
- Fixed issue with incorrect number of users

### v1.0:
- Plugin scan function 
