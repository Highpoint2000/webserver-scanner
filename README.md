# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin provides scanning functions for the FM-DX web server.

![image](https://github.com/user-attachments/assets/fc4d92c1-b5eb-4191-921a-c1afc4feb2aa)


![image](https://github.com/user-attachments/assets/9b3401ac-1595-4f4b-a186-9f7e7c6eaead)

## v3.1a

- The search bug has been fixed

For URDS uploads, the uploader version from 1.0d upwards must be used!

## Installation notes:

1. [Download](https://github.com/Highpoint2000/webserver-scanner/releases) the last repository as a zip
2. Unpack all files from the plugins folder to ..fm-dx-webserver-main\plugins\ 
3. Stop or close the fm-dx-webserver
4. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
5. Activate the scanner plugin in the settings
6. Stop or close the fm-dx-webserver
7. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations
8. Configure your personal settings in the automatically created scanner.json (in the folder: ../fm-dx-webserver-main/plugins_configs)
9. Stop or close the fm-dx-webserver
10. Start/Restart the fm-dx-webserver with "npm run webserver" on node.js console, check the console informations

## Configuration options:

The following variables can be changed in the configPlugin.json:

    /// SCANNER OPTIONS ////

    Scanmode: 1, 			// 0 - offline mode or 1 - online mode (1- default)
    Autoscan_PE5PVB_Mode: false,	// Set to 'true' if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware. Set it 'true' for FMDX Scanner Mode!
    Search_PE5PVB_Mode: false, 	// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware.
    StartAutoScan: 'off', 		// Set to 'off/on/auto' (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)  Set it 'on' or 'auto' for FMDX Scanner Mode!
    AntennaSwitch: 'off', 		// Set to 'off/on' for automatic switching with more than 1 antenna at the upper band limit / Only valid for Autoscan_PE5PVB_Mode = false 
	
    defaultSensitivityValue: 30, 	// Value in dBf/dBµV: 5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60,-55,-50,-45,-40 | in PE5PVB_Mode: 1,5,10,15,20,25,30
    defaultScanHoldTime: 7, 	// Value in s: 1,3,5,7,10,15,20,30 / default is 7 / Only valid for Autoscan_PE5PVB_Mode = false 
    defaultScannerMode: 'normal', 	// Set the startmode: 'normal', 'blacklist', 'whitelist', 'spectrum', 'difference', 'spectrumBL' or 'differenceBL' / Only valid for PE5PVB_Mode = false 
    scanIntervalTime: 500,		// Set the waiting time for the scanner here. (Default: 500 ms) A higher value increases the detection rate, but slows down the scanner!
    scanBandwith: 0,          	// Set the bandwidth for the scanning process here (default = 0 [auto]). Possible values ​​are 56000, 64000, 72000, 84000, 97000, 114000, 133000, 151000, 184000, 200000, 217000, 236000, 254000, 287000, 311000

    EnableBlacklist: false,		// Enable Blacklist, set it 'true' or 'false' 
    EnableWhitelist: false,		// Enable Whitelist, set it 'true' or 'false' 

    tuningLowerLimit: '',	        // Set the lower band limit (e.g. '87.5') if the values ​​differ from the web server settings (default is '',)	
    tuningUpperLimit: '',		// Set the upper band limit (e.g. '108.0') if the values ​​differ from the web server settings (default is '',)
    
    /// SPECTRUM SCANNER OPTIONS ///
    
    EnableSpectrumScan: false,	// Enable Spectrum, set it 'true' or 'false' / for 'true' spectrum graph plugin must be installed!
    EnableDifferenceScan: false,	// Enable Spectrum, set it 'true' or 'false' / for 'true' spectrum graph plugin must be installed!
    SpectrumChangeValue: 0,		// default is 0 (off) / Deviation value in dBf/dBµV eg. 1,2,3,4,5,... so that the frequency is scanned by deviations
    SpectrumLimiterValue: 50,	// default is 50 / Value in dBf/dBµV ... at what signal strength should stations (locals) be filtered out
    SpectrumPlusMinusValue: 50,	// default is 50 / Value in dBf/dBµV ... at what signal strength should the direct neighboring channels (+/- 0.1 MHz of locals) be filtered out

    /// HTML LOGGING OPTIONS ////
	
    RAWLog: false, 			// Set to 'true' or 'false' for RAW data logging.  default is false
    OnlyFirstLog: false, 		// For only first seen logging, set each station found to 'true' or 'false', default is false
    UTCtime: true, 			// Set to 'true' for logging with UTC Time, default is true

    /// FMLIST LOGGING OPTIONS ////
 
    FMLIST_OM_ID: '', 		// To use the logbook function, please enter your OM ID here, for example: FMLIST_OM_ID: '1234' - this is only necessary if no OMID is entered under FMLIST INTEGRATION on the web server
    FMLIST_Autolog: 'off',		// Setting the FMLIST autolog function. Set it to 'off' to deactivate the function, “on” to log everything and 'auto' if you only want to log in scanning mode (autoscan or background scan)
    FMLIST_MinDistance: 200,	// set the minimum distance in km for an FMLIST log entry here (default: 200, minimum 150)
    FMLIST_MaxDistance: 2000,  	// set the maximum distance in km for an FMLIST log entry here (default: 2000, minimum 151)
    FMLIST_LogInterval: 60,    	// Specify here in minutes when a log entry can be sent again (default: 60, minimum 60)
    FMLIST_CanLogServer: '',	// Activates a central server to manage log repetitions (e.g. '127.0.0.1:2000', default is '')

    BEEP_CONTROL: false		// Acoustic control function for scanning operation (true or false)

## Important notes: 

- Auto Scan Mode with the options is only usable with ADMIN- oder TUNE-Athentification !!!
- By briefly pressing the Auto Scan button you start/stop the automatic scanning process. Pressing the button longer opens or closes the scanner's setting options
- The automatic antenna switching only works if more than 1 antenna is configured in the web server !!!
- Add a white- or blacklist function: file ../plugins/Scanner/whitelist.txt or blacklist.txt must be created with the frequencies:  89.800 89.400 100.80 ... They can be written next to or below each other with space
- For ESP32 receivers (e.g. TEF6686) the plugin can uses the newly integrated firmware scan and search function. However, the prerequisite is the installation of the latest PE5PVB firmware version. 
- Auto scanner and logging preferences can be configured in the scanner.json under /plugin_configs
- In the HTML file you can klick on the header fields to sort the column or you enter a term in the search field
- In order to use the live stream link in the log file, you must register at fmscan.org. When you open a link for the first time, you have to authenticate yourself with it
- Since all FMLIST log entries are created automatically, with FMLIST Autolog  mode "on" the manual log button is hidden on the web interface, in the Autolog mode “auto”, the manual log button is only hidden on the web interface during the autoscan process
- If there are several web servers, it makes sense to use a central server to register the logs that have already been sent. The [CanLogServer](https://github.com/Highpoint2000/canlog-server) can provide this functionality. When the server is used, the log interval set in the scanner.json is inactive because the log interval set for the server takes precedence!
- The computer's standard sound output is used for acoustic signaling during the scanning process
- For FMDX scanning operation, we recommend reducing the defaultScanHoldTime to 2-3 seconds and setting Autoscan_PE5PVB_Mode: false
- To use the fast spectrum scan, the spectrum graph plugin must be installed. The SpectrumLimiterValue variable can be used to set an upper limit for the filter of strong transmitters. Transmitters that exceed this value are filtered out. Use the variable Spectrum PlusMinus Value to set a signal strength of a strong/local station independently of the Spectrum Limiter Value, where the neighboring channels (+/- 0.1 MHz) should be filtered out. To automatically recreate the spectrum after each frequency scan, the rescanDelay variable in the SpectrumGraph.json must be set to 0 !!! 
- Difference Scan (extension of spectrum scan): The SpectrumChangeValue (dBf/dBµV) indicates in which +/- range the signal must differ from the previous scan for the frequency to be used. Only frequencies with this change are then scanned
- To use the urds log protocol, please install the [URDS Upload Plugin](https://github.com/Highpoint2000/URDSupload)
- When GPS data is received, the location is updated dynamically (GPS receiver and [GPS plugin](https://github.com/Highpoint2000/GPS) required!)
- To use the fm-dx-monitor set the OnlyScanHoldTime 'on' and choose a minimum defaultScanHoldTime of 5 seconds

After activating/deactivating the plugin or making changes to the scanner.json script, the server must be restarted!!!

## Known bugs:
- When you start the auto scanner in PE5PVB mode, the frequency freezes for a few seconds
- If the server is locked, the scanner will no longer work
- With newer node.js libraries there may be problems installing the speaker module. If acoustic signaling is desired, the node.js version must be downgraded!

<details>
  <summary>History</summary>
  
### v3.1

- Search stop function when pressed repeatedly
- Switch for mandatory use of ScanHoldTime implemented (useful for fm-dx-monitor!)
- Column 30 in the urds log file removed (now supplemented with URDS Uploader from version 1.0d!) 
- Logs with ? in the PS information are now logged
- various code and scanner optimizations  
  
### v3.0 (FMDX Scanner Version)

- XML protocol converted to URDS format (To use the protocol, please install the [URDS Upload Plugin](https://github.com/Highpoint2000/URDSupload))
- Processing of GPS data (GPS Receiver & [GPS plugin](https://github.com/Highpoint2000/GPS) required!)
- Added acoustic signaling during scanning operation
- Daily update check for admin
- Scan algorithm revised
- Added fast spectrum scan with limiter and filter for strong station (spectrum graph plugin must be installed!)
- Added ultrafast difference scan option with limiter and filter for strong station (spectrum graph plugin must be installed!)
- Added tuningLowerLimit and tuningUpperLimit

### v2.8d (only works from web server version 1.3.1 and CanLogServer 2.0!!!)

- Starting frequencies above 74 MHz are rounded to 100 kHz during the autoscan

### v2.8c (only works from web server version 1.3.1 and CanLogServer 2.0!!!)

- bugfixing
- Adjustments for [CanLogServer](https://github.com/Highpoint2000/canlog-server) (Version 2.0)

### v2.8b (only works from web server version 1.3.1 !!!)

- Automatic jump back of the background scanner to the initial frequency if no frequency is configured when loading the web server

### v2.8a (only works from web server version 1.3.1 !!!)

- Option to use the CanLogServer (see important notes!)

### v2.8 (only works from web server version 1.3.1 !!!)

- FMLIST integration for automatic logging (For details see configuration options and important notes!)

### v2.7b (only works from web server version 1.2.8.1 !!!)

- Bugfixing

### v2.7a (only works from web server version 1.2.8.1 !!!)

- Bugfixing

### v2.7a (only works from web server version 1.2.8.1 !!!)

- Added options to set scanIntervalTime and scanBandwith in the configuration file
- Delay serialport connection loss check on startup (thanks to AmateurRadioDude)
- Added signal strength to logfile

### v2.6c (only works from web server version 1.2.8.1 !!!)

- Blacklist and Whitelist can switch off in config file
- Fixed problem creating plugins_configs path

### v2.6b (only works from web server version 1.2.8.1 !!!)
- bugfixing
- configPlugin.json is moved to ../fm-dx-webserver-main/plugins_configs/scanner.json
- Switches for blacklist and whitelist built into the config file
- HTML Language Tag set to English

### v2.6a (only works from web server version 1.2.8.1 !!!)
- Adaptation of the web socket /extra to /data_plugins, index.js update is no longer needed from now on!

### v2.6 (only works from web server version 1.2.8 !!!)
- New notification design (Toast Notification)

### v2.5 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- FIRST LOG MODE now displayed in the log file

### v2.4 (only works from web server version 1.2.6 - older versions must take the plugin version 1.3c oder 1.3d !!!)
- Fixed configuration is now stored in configPlugin.json

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

</details>
