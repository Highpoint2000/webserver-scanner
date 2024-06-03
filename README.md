# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)
![image](https://github.com/Highpoint2000/webserver-scanner/assets/168109804/989494ef-54ab-4494-a76e-f659cec6ca7f)


## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack it into the plugins folder in the root of the web server
3. Restart the server
4. Activate it in the settings

This plugin provides scanning functions for the FM-DX web server.

### Important notes: 

For ESP32 (e.g. TEF6686) receivers, the plugin uses the newly integrated scan function. However, the prerequisite is the latest firmware version (RC version). In addition to scanning control using the additional left/right buttons, the scanning sensitivity can be adjusted in the receiver's menu. In addition, the receiver's integrated auto scan mode can be started and stopped via the web interface.  If you don't have a suitable firmware version running on your ESP32 receiver or use a receiver of a different type, you can use the plugin's scan mode using a switch (true/false) in the plugin's source code. However, Auto Scan is not available in this operating mode.

### Known bugs:
- Currently, no status updates on the status of the scanner can be retrieved from the receiver. The reload of the website starts with Auto Scan off. The last state is saved with cookies.
- There are problems when using upstream proxy servers and NON-TEF receivers

### Versions:

v1.1:
- Add a Auto Scan Mode for ESP32 receiver (Newewst PE5PVB ESP32 firmware (RC-Version) required!)
- Merging the functionalities of v1.0 and v1.0a (Switching in JS-Code)

v1.0a:
- Direct use of the integrated scan function of the ESP32 receiver (PE5PVB ESP32 firmware required!)
- Fixed issue with incorrect number of users

 v1.0:
- Plugin scan function 
