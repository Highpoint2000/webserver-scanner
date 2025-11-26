# Scanner Plugin for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver)

This plugin provides scanning functions for the FM-DX web server.

![image](https://github.com/user-attachments/assets/fc4d92c1-b5eb-4191-921a-c1afc4feb2aa)

![image](https://github.com/user-attachments/assets/9b3401ac-1595-4f4b-a186-9f7e7c6eaead)

![image](https://github.com/user-attachments/assets/853859b9-b472-4560-99c1-84a12950bd88)

![image](https://github.com/user-attachments/assets/0a327a52-39b7-4b97-8a8e-ec90c91e8cd6)


## v3.9a (FMDX Connector compatible Version - HOTFIX)

- Control options for the [TEF Logger App](https://github.com/Highpoint2000/TEFLoggerApp) (v3.4) and [FMDX Connector](https://github.com/Highpoint2000/FMDXConnector) (v1.0) have been implemented
- Corrected client status and the starting and stopping of autoscan mode
- Fixed a bug in the unit of measurement switching
 
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

To create or modify the scanner configuration file (scanner.json) please use the [Scanner Wizard](https://tef.noobish.eu/logos/scanner_wizard.html). All options are stored and described there.

![image](https://github.com/user-attachments/assets/244a2036-6279-4066-9c90-193a9c47319a)


After making changes to the scanner.json script, the server must be restarted!!!

## Important notes: 

- Auto Scan Mode with the options is only usable with ADMIN- oder TUNE-Athentification !!!
- By briefly pressing the Auto Scan button you start/stop the automatic scanning process. Pressing the button longer opens or closes the scanner's setting options
- The automatic antenna switching only works if more than 1 antenna is configured in the web server !!!
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
- When GPS data is received, the location is updated dynamically (GPS receiver and [GPS plugin](https://github.com/Highpoint2000/GPS) required!)
- To use the fm-dx-monitor set the OnlyScanHoldTime 'on' and choose a minimum defaultScanHoldTime of 5 seconds
- Whitelist entries are processed with 0.01 MHZ increments
- URDS CSV Log protocol and Map Viewer Button can be activated with CSVcreate option in the configuration settings
- for manual or automatic upload the URDS CSV log protocol, please install the [URDS Upload Plugin](https://github.com/Highpoint2000/URDSupload)
- Attention! To use dynamic sensitivity calibration, the reference frequency entered must be within the web server's approved frequency range. For example, 87.1 is within the range 87.0 - 108.0 MHz. The range to be scanned must be defined using the variables tuningLowerLimit and tuningUpperLimit in the scanner.json file and must also be within the web server's approved frequency range.

### Blacklist & Whitelist Options

The scanner plugin contains various blacklist options and a whitelist function. The necessary files with sample data are included in the plugin package. The whitelist.txt file can be used to store frequencies (e.g., 89.800, 89.400, 100.80, separated by spaces) that are scanned exclusively in the "Whitelist" scan mode. Likewise, the blacklist.txt file can be used to define frequencies that are not scanned (i.e., skipped and therefore not logged) in the "Blacklist," "SpectrumBL," and "DifferenceBL" scan modes. The blacklist_log.txt file is used to explicitly exclude frequencies and/or PI codes from being entered into the log files. This also applies to logs with the manual search (<< >>). Using blacklist_fmlist.txt, frequencies and/or PI codes can be additionally excluded from FMLIST publication. The use of the blacklist or whitelist must be configured in the scanner.json configuration file.

### Known bugs:
- When you start the auto scanner in PE5PVB mode, the frequency freezes for a few seconds
- If the server is locked, the scanner will no longer work
- With newer node.js libraries there may be problems installing the speaker module. If acoustic signaling is desired, the node.js version must be downgraded!

## Contact

If you have any questions, would like to report problems, or have suggestions for improvement, please feel free to contact me! You can reach me by email at highpoint2000@googlemail.com. I look forward to hearing from you!

<a href="https://www.buymeacoffee.com/Highpoint" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

<details>
<summary>History</summary>

### v3.9 (FMDX Connector compatible Version)

- Control options for the [TEF Logger App](https://github.com/Highpoint2000/TEFLoggerApp) (v3.4) and [FMDX Connector](https://github.com/Highpoint2000/FMDXConnector) (v1.0) have been implemented

### v3.8f (compatible from webserver version 1.3.8!!!)

- Extended URDS CSV protocol implemented (storage of station data for faster evaluation e.g. in the map viewer)

For URDS uploads, the uploader version from 1.0g (Version with dBµV Flag) upwards must be used!
 
### v3.8e (compatible from webserver version 1.3.8!!!)

- Scanner interface also works with strict tracking protection at Edge

For URDS uploads, the uploader version from 1.0g (Version with dBµV Flag) upwards must be used!

### v3.8d (compatible from webserver version 1.3.8!!!)

- Fixed a bug that caused the scan to stop at the upper band limit when the SensitivityCalibrationFrequency was not used
- Fixed incorrect display of signal strength unit in dropdown menu and console
- dBµV is now fixed Unit for CSV File 

For URDS uploads, the uploader version from 1.0g (Version with dBµV Flag) upwards must be used!

### v3.8c (compatible from webserver version 1.3.8!!!)

- Added UUID check - Token required for publishing logs to FMLIST
- Default FMLIST_LogInterval set to 60 minutes
- Fixed error in log interval conversion
- Fixed FMLIST publishing without PI & PS
- PI codes with 0000 are now logged
- Column sorting in HTML template corrected

For URDS uploads, the uploader version from 1.0g (Version witht dBµV Flag) upwards must be used!

### v3.8b (compatible from webserver version 1.3.8!!!)

- Fixed problem with stopping at the upper band limit

### v3.8a (compatible from webserver version 1.3.8!!!)

- Code optimizations for dynamically noise level scan (please refer to the comments under important notes for setup!)

### v3.8 (compatible from webserver version 1.3.8!!!)

- New variable to define a reference frequency to dynamically scan the current noise level (please refer to the comments under important notes for setup!)
- Information about antenna switching hidden in the console
- Display of the sensitivity value and spectrum limiter value in the spectrum updated

### v3.7e (compatible from webserver version 1.3.8!!!)

- Skipping frequencies with signal levels below the signal value stored in the spectrum analysis
- Updating the signal level in the spectrum analysis with conductance values
- Update display is now in the web server settings under Plugins (Thanks to AmateurAudioDude for the Code)

### v3.7d (compatible from webserver version 1.3.8!!!)

- "Map all" link in HTML log brought forward
- Additional column “Mode” added in the HTML protocol (M – manual / A – autoscan)

### v3.7c (compatible from webserver version 1.3.8!!!)

- Design adjustments for the new mobile layout
- Button design created for SDR receiver

For URDS uploads, the uploader version from 1.0g (Version witht dBµV Flag) upwards must be used!

### v3.7b

- Minor design work
- Blacklist function tidied up Minor design work (see Blacklist & Whitelist Options)

### v3.7a

- Used antenna added to the HTML Log

### v3.7

- Error message hidden
- Additional values ​​for sensitivity and scan hold time added
- Renamed variables for HTML logging
- Added a new variable for HTML logging of unidentified transmitters

### v3.6a

- The signal strength units are now correctly logged, different from dBf

### v3.6

- Add a special blacklist function for the Logfile entries (see instructions!)
- Future spamming protection for the scanner plugin implemented (Thanks to AmateurAudioDude!)
- Bandwidth information changed to Hz

### v3.5

- Add a blacklist function for the FMLIST log entries (see instructions!)

### v3.4b

- Fixed incorrect display of server name in FMLIST log
- Bug when disabling CSV log creation fixed

### v3.4a

- Protocols with a distance >700km are now automatically marked as Es (Sporadic E) on FMLIST
- The signal strength indication in the FMLIST Log has been changed to dBµV
- The minimum distance for an automatic log entry is now 200 km and the repetition interval has been increased to 6 hours

### v3.4

- Added option to create the URSD CSV log file, this also activates a map viewer button to open and evaluate the log file

### v3.3c

- Fixed an issue when stopping the scan at the upper band limit
- Removed duplicate message from FMLIST log
- Rollback Code optimization from Version 3.3b

### v3.3b

- Fixed an issue when stopping the scan at the upper band limit
- Code optimization for PS detection performed (thanks to AmateurAudioDude)

### v3.3a

- improved CSV logging mode for PS information

### v3.3

- Fixed an error when publishing a version 3.2c FMLIST entry
- Whitelist entries are now also processed with 0.01 MHZ increments
- Adding a new variable CSVcompletePS for logging with and without full PS information
- minor code corrections

### v3.2c

- fixed problem with doubled autologged entry 
- small design adjustment

For URDS uploads, the uploader version from 1.0g (Version witht dBµV Flag) upwards must be used!

### v3.2b

- Fixed the problem with the background and the display of the “autoscan active” screen
 
### v3.2a

- Corrected display of Auto Log button on smaller display
- Fixed temporary display of small scanner buttons during reload
- Start time for automatic scan increased from 5 seconds to 15 seconds
- Small code corrections regarding writing the log file

For URDS uploads, the uploader version from 1.0g (Version witht dBµV Flag) upwards must be used!
  
### v3.2

- URDS RDS data added (e.g RT, Station ID, ECC)
- Signal unit for URDS Log changed to dBµV
- Added PS filter for error-free URDS logs
- Added display of the current antenna and server short name for FMLIST logbook entries
- Bug with the red flashing chat symbol fixed

For URDS uploads, the uploader version from 1.0g (Version witht dBµV Flag) upwards must be used!
  
### v3.1c

- Bug fixes 
- duplicate messages removed

For URDS uploads, the uploader version from 1.0d upwards must be used!
  
### v3.1b

- Bug fixes and code optimizations
- Added antenna switching for whitelist mode

For URDS uploads, the uploader version from 1.0d upwards must be used!
  
### v3.1a

- The search bug has been fixed
  
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
