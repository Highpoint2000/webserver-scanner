///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER SERVER SCRIPT FOR FM-DX-WEBSERVER (V3.7d)      ///
///                                                         ///
///  by Highpoint               last update: 09.05.25       ///
///  powered by PE5PVB                                      ///
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

/////// compatible from webserver version 1.3.8 !!! ///////////

const https = require('https');
const path = require('path');
const fs = require('fs');
const { logInfo, logError, logWarn } = require('./../../server/console');
const apiData = require('./../../server/datahandler');

// Define the paths to the old and new configuration files
const oldConfigFilePath = path.join(__dirname, 'configPlugin.json');
const newConfigFilePath = path.join(__dirname, './../../plugins_configs/scanner.json');

// Default values for the configuration file
const defaultConfig = {
    Scanmode: 1,                         // 0 - offline mode or 1 - online mode
    Autoscan_PE5PVB_Mode: false,         // Set to 'true' if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware. Set it 'true' for FMDX Scanner Mode!
    Search_PE5PVB_Mode: false,           // Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware.
    StartAutoScan: 'off',                // Set to 'off/on/auto' (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)  Set it 'on' or 'auto' for FMDX Scanner Mode!
    AntennaSwitch: 'off',                // Set to 'off/on' for automatic switching with more than 1 antenna at the upper band limit / Only valid for Autoscan_PE5PVB_Mode = false 
	OnlyScanHoldTime: 'off',			 // Set to 'on/off' to force ScanHoldTime to be used for the detected frequency / use it for FM-DX monitoring

    defaultSensitivityValue: 30,         // Value in dBf/dBµV: 1,2,3,4,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60,-55,-50,-45,-40 | in PE5PVB_Mode: 1,5,10,15,20,25,30
    defaultScanHoldTime: 5,              // Value in s: 1,2,3,4,5,7,10,15,20,30 / default is 7 / Only valid for Autoscan_PE5PVB_Mode = false  
    defaultScannerMode: 'normal',        // Set the startmode: 'normal', 'spectrum', 'spectrumBL', 'difference', 'differenceBL', 'blacklist', or 'whitelist' / Only valid for PE5PVB_Mode = false 
    scanIntervalTime: 500,               // Set the waiting time for the scanner here. (Default: 500 ms) A higher value increases the detection rate, but slows down the scanner!
    scanBandwith: 0,                     // Set the bandwidth in Hz for the scanning process here (default = 0 [auto]). Possible values ​​are 56000, 64000, 72000, 84000, 97000, 114000, 133000, 151000, 184000, 200000, 217000, 236000, 254000, 287000, 311000

    EnableBlacklist: false,              // Enable Blacklist, set it 'true' or 'false' / the blacklist.txt file with frequency values ​​(e.g. 89.000) must be located in the scanner plugin folder 
    EnableWhitelist: false,              // Enable Whitelist, set it 'true' or 'false' / the whitelist.txt file with frequency values ​​(e.g. 89.000) must be located in the scanner plugin folder 
	
	tuningLowerLimit: '',	             // Set the lower band limit (e.g. '87.5') if the values ​​differ from the web server settings (default is '',)	
	tuningUpperLimit: '',				 // Set the upper band limit (e.g. '108.0') if the values ​​differ from the web server settings (default is '',)

    EnableSpectrumScan: false,           // Enable Spectrum, set it 'true' or 'false'
    EnableDifferenceScan: false,         // Enable Spectrum, set it 'true' or 'false'
    SpectrumChangeValue: 0,              // default is 0 (off) / Deviation value in dBf/dBµV eg. 1,2,3,4,5,... so that the frequency is scanned by deviations
    SpectrumLimiterValue: 100,            // default is 50 / Value in dBf/dBµV ... at what signal strength should stations (locals) be filtered out
    SpectrumPlusMinusValue: 100,          // default is 70 / Value in dBf/dBµV ... at what signal strength should the direct neighboring channels (+/- 0.1 MHz of locals) be filtered out

	HTMLlogOnlyID: true,					// Set to 'true' or 'false' for only logging identified stations, default is true (only valid for HTML File!)
    HTMLlogRAW: false,                       // Set to 'true' or 'false' for RAW data logging, default is false (only valid for HTML File!)
    HTMLOnlyFirstLog: false,                 // For only first seen logging, set each station found to 'true' or 'false', default is false (only valid for HTML File!)
	CSVcreate: true,					 // Set to 'true' or 'false' for create CSV logging file and Mapviewer button, default is true
	CSVcompletePS: true,				 // Set to 'true' or 'false' for CSV data logging with or without PS Information, default is true
    UTCtime: true,                       // Set to 'true' for logging with UTC Time, default is true (only valid for HTML File!)
	Log_Blacklist: false,        		 // Enable Log Blacklist, set it 'true' or 'false' / the blacklist_log.txt file with the values ​​(e.g. 89.000;D3C3 or 89.000 or D3C3) must be located in the scanner plugin folder 
	SignalStrengthUnit: 'dBf',			 // Set to 'dBf', 'dBm' or 'dBµV' 

    FMLIST_OM_ID: '',                    // To use the logbook function, please enter your OM ID here, for example: FMLIST_OM_ID: '1234' - this is only necessary if no OMID is entered under FMLIST INTEGRATION on the web server
    FMLIST_Autolog: 'off',               // Setting the FMLIST autolog function. Set it to 'off' to deactivate the function, “on” to log everything and 'auto' if you only want to log in scanning mode (autoscan or background scan)
    FMLIST_MinDistance: 200,             // set the minimum distance in km for an FMLIST log entry here (default: 200, minimum 200)
    FMLIST_MaxDistance: 2000,            // set the maximum distance in km for an FMLIST log entry here (default: 2000, minimum 200)
    FMLIST_LogInterval: 3600,            // Specify here in minutes when a log entry can be sent again (default: 3600, minimum 3600)
    FMLIST_CanLogServer: '',             // Activates a central server to manage log repetitions (e.g. '127.0.0.1:2000', default is '')   
	FMLIST_ShortServerName: '',		     // set short servername (max. 10 characters) e.g. 'DXserver01', default is '' 
	FMLIST_Blacklist: false,             // Enable FMLIST Blacklist, set it 'true' or 'false' / the blacklist_fmlist.txt file with the values ​​(e.g. 89.000;D3C3 or 89.000 or D3C3) must be located in the scanner plugin folder 

    BEEP_CONTROL: false,                 // Acoustic control function for scanning operation (true or false)
};


// Function to merge default config with existing config and remove undefined values
function mergeConfig(defaultConfig, existingConfig) {
    const updatedConfig = {};

    // Add the existing values that match defaultConfig keys
    for (const key in defaultConfig) {
        updatedConfig[key] = key in existingConfig ? existingConfig[key] : defaultConfig[key];
    }

    return updatedConfig;
}

// Function to load the old config, move it to the new location, and delete the old one
function migrateOldConfig(oldFilePath, newFilePath) {
    if (fs.existsSync(oldFilePath)) {
        // Load the old config
        const oldConfig = JSON.parse(fs.readFileSync(oldFilePath, 'utf-8'));
        
        // Save the old config to the new location
        fs.writeFileSync(newFilePath, JSON.stringify(oldConfig, null, 2), 'utf-8');
        logInfo(`Old config migrated to ${newFilePath}`);

        // Delete the old config file
        fs.unlinkSync(oldFilePath);
        logInfo(`Old config ${oldFilePath} deleted`);
        
        return oldConfig;
    }

    return null;  // No old config found
}

// Function to load or create the configuration file
function loadConfig(filePath) {
    let existingConfig = {};

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(`Directory created: ${dirPath}`);
    }

    // Try to migrate the old config if it exists
    const migratedConfig = migrateOldConfig(oldConfigFilePath, filePath);
    if (migratedConfig) {
        existingConfig = migratedConfig;
    } else {
        // Check if the new configuration file exists
        if (fs.existsSync(filePath)) {
            // Read the existing configuration file
            existingConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            logInfo('Scanner configuration not found. Creating scanner.json.');
        }
    }

    // Merge the default config with the existing one, adding missing fields and removing undefined
    const finalConfig = mergeConfig(defaultConfig, existingConfig);

    // Write the updated configuration back to the file (if changes were made)
    fs.writeFileSync(filePath, JSON.stringify(finalConfig, null, 2), 'utf-8');

    return finalConfig;
}

// Load or create the configuration file
const configPlugin = loadConfig(newConfigFilePath);

// Zugriff auf die Variablen wie bisher
const Scanmode = configPlugin.Scanmode;
const Autoscan_PE5PVB_Mode = configPlugin.Autoscan_PE5PVB_Mode;
const Search_PE5PVB_Mode = configPlugin.Search_PE5PVB_Mode;
const StartAutoScan = configPlugin.StartAutoScan;
const AntennaSwitch = configPlugin.AntennaSwitch;
const OnlyScanHoldTime = configPlugin.OnlyScanHoldTime;

const defaultSensitivityValue = configPlugin.defaultSensitivityValue;
const defaultScanHoldTime = configPlugin.defaultScanHoldTime;
const defaultScannerMode = configPlugin.defaultScannerMode;
  let scanIntervalTime = configPlugin.scanIntervalTime;
const scanBandwith = configPlugin.scanBandwith;

const EnableBlacklist = configPlugin.EnableBlacklist;
const EnableWhitelist = configPlugin.EnableWhitelist;

let tuningLowerLimit = configPlugin.tuningLowerLimit;
let tuningUpperLimit = configPlugin.tuningUpperLimit;

const EnableSpectrumScan = configPlugin.EnableSpectrumScan;
const EnableDifferenceScan = configPlugin.EnableDifferenceScan;
const SpectrumChangeValue = configPlugin.SpectrumChangeValue;
const SpectrumLimiterValue = configPlugin.SpectrumLimiterValue;
const SpectrumPlusMinusValue = configPlugin.SpectrumPlusMinusValue

const HTMLlogOnlyID = configPlugin.HTMLlogOnlyID;
const HTMLlogRAW = configPlugin.HTMLlogRAW;
const HTMLOnlyFirstLog = configPlugin.HTMLOnlyFirstLog;
const CSVcreate = configPlugin.CSVcreate
const CSVcompletePS = configPlugin.CSVcompletePS
const UTCtime = configPlugin.UTCtime;
  let Log_Blacklist = configPlugin.Log_Blacklist;
  let SignalStrengthUnit = configPlugin.SignalStrengthUnit;

  let FMLIST_OM_ID = configPlugin.FMLIST_OM_ID;
const FMLIST_Autolog = configPlugin.FMLIST_Autolog;
  let FMLIST_MinDistance = configPlugin.FMLIST_MinDistance;
  let FMLIST_MaxDistance = configPlugin.FMLIST_MaxDistance;
  let FMLIST_LogInterval = configPlugin.FMLIST_LogInterval;
const FMLIST_CanLogServer = configPlugin.FMLIST_CanLogServer;
  let FMLIST_ShortServerName = configPlugin.FMLIST_ShortServerName;
  let FMLIST_Blacklist = configPlugin.FMLIST_Blacklist;

const BEEP_CONTROL = configPlugin.BEEP_CONTROL;

const { execSync } = require('child_process');
const NewModules = ['speaker'];
let Speaker;

let EnableSpectrumScanBL = false;
let EnableDifferenceScanBL = false;

if (EnableSpectrumScan && EnableBlacklist) {
	EnableSpectrumScanBL = true;
}

if (EnableDifferenceScan && EnableBlacklist) {
	EnableDifferenceScanBL = true;
}

if (defaultScannerMode === 'spectrumBL' && !EnableSpectrumScanBL) {
	defaultScannerMode = 'spectrum';
}

if (defaultScannerMode === 'differenceBL' && !EnableDifferenceScanBL) {
	defaultScannerMode = 'difference';
}

if (SpectrumLimiterValue === 0) {
    SpectrumLimiterValue = 100;
}  

if (SpectrumPlusMinusValue === 0) {
    SpectrumPlusMinusValue = 100;
}  

if (scanIntervalTime > 1000) {
	scanIntervalTime = 1000;
}

SpectrumPlusMinusValue
function checkAndInstallNewModules() {
    NewModules.forEach(module => {
        const modulePath = path.join(__dirname, './../../node_modules', module);
        if (!fs.existsSync(modulePath)) {
            logInfo(`Module ${module} is missing. Installing...`);
            try {
                execSync(`npm install ${module}`, { stdio: 'inherit' });
                logInfo(`Module ${module} installed successfully.`);
            } catch (error) {
                logError(`Error installing module ${module}:`, error);
                process.exit(1);
            }
        }
    });
}

if (BEEP_CONTROL) {
  checkAndInstallNewModules();
  Speaker = require('speaker');
}

// Path to the target JavaScript file
const ScannerClientFile = path.join(__dirname, 'scanner.js');

// Function to start the process
function updateSettings() {
  // Read the target file
  fs.readFile(ScannerClientFile, 'utf8', (err, targetData) => {
    if (err) {
      logError('Error reading the scanner.js file:', err);
      return;
    }
	
    // Check if the variables EnableBlacklist and EnableWhitelist already exist
    let hasEnableBlacklist = /const EnableBlacklist = .+;/.test(targetData);
    let hasEnableWhitelist = /const EnableWhitelist = .+;/.test(targetData);
	let hasEnableSpectrumScan = /const EnableSpectrumScan = .+;/.test(targetData);
	let hasEnableSpectrumScanBL = /const EnableSpectrumScanBL = .+;/.test(targetData);
	let hasEnableDifferenceScan = /const EnableDifferenceScan = .+;/.test(targetData);
	let hasEnableDifferenceScanBL = /const EnableDifferenceScanBL = .+;/.test(targetData);

    // Replace or add the definitions
    let updatedData = targetData;

    if (hasEnableBlacklist) {
      updatedData = updatedData.replace(/const EnableBlacklist = .*;/, `const EnableBlacklist = ${EnableBlacklist};`);
    } else {
      // If EnableBlacklist does not exist, add it at the beginning
      updatedData = `const EnableBlacklist = ${EnableBlacklist};\n` + updatedData;
    }

    if (hasEnableWhitelist) {
      updatedData = updatedData.replace(/const EnableWhitelist = .*;/, `const EnableWhitelist = ${EnableWhitelist};`);
    } else {
      // If EnableWhitelist does not exist, add it at the beginning
      updatedData = `const EnableWhitelist = ${EnableWhitelist};\n` + updatedData;
    }
	
	if (hasEnableSpectrumScan) {
      updatedData = updatedData.replace(/const EnableSpectrumScan = .*;/, `const EnableSpectrumScan = ${EnableSpectrumScan};`);
    } else {
      // If hasEnableSpectrumScan does not exist, add it at the beginning
      updatedData = `const EnableSpectrumScan = ${EnableSpectrumScan};\n` + updatedData;
    }
	
	if (hasEnableSpectrumScanBL) {
      updatedData = updatedData.replace(/const EnableSpectrumScanBL = .*;/, `const EnableSpectrumScanBL = ${EnableSpectrumScanBL};`);
    } else {
      // If hasEnableSpectrumScanBL does not exist, add it at the beginning
      updatedData = `const EnableSpectrumScanBL = ${EnableSpectrumScanBL};\n` + updatedData;
    }
	
	if (hasEnableDifferenceScan) {
      updatedData = updatedData.replace(/const EnableDifferenceScan = .*;/, `const EnableDifferenceScan = ${EnableDifferenceScan};`);
    } else {
      // If hasEnableDifferenceScan does not exist, add it at the beginning
      updatedData = `const EnableDifferenceScan = ${EnableDifferenceScan};\n` + updatedData;
    }
	
	if (hasEnableDifferenceScanBL) {
      updatedData = updatedData.replace(/const EnableDifferenceScanBL = .*;/, `const EnableDifferenceScanBL = ${EnableDifferenceScanBL};`);
    } else {
      // If hasEnableDifferenceScanBL does not exist, add it at the beginning
      updatedData = `const EnableDifferenceScanBL = ${EnableDifferenceScanBL};\n` + updatedData;
    }

    // Update/write the target file
    fs.writeFile(ScannerClientFile, updatedData, 'utf8', (err) => {
      if (err) {
        logError('Error writing to the scanner.js file:', err);
        return;
      }
      logInfo('Scanner.js file successfully updated');
    });
  });
}

// Start the process
updateSettings();

////////////////////////////////////////////////////////////////

const WebSocket = require('ws');
const config = require('./../../config.json');

const ServerName = config.identification.tunerName; 
const ServerDescription = config.identification.tunerDesc; 
const DefaultFreq = config.defaultFreq;
const enableDefaultFreq = config.enableDefaultFreq;
const Antennas = config.antennas;
const webserverPort = config.webserver.webserverPort || 8080; // Default to port 8080 if not specified
let LAT = config.identification.lat; 
let LON = config.identification.lon; 

const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;
const ScanPE5PVB = Autoscan_PE5PVB_Mode;
const SearchPE5PVB = Search_PE5PVB_Mode;
const status = '';
const Search = '';
const source = '127.0.0.1';
const logDir = path.resolve(__dirname, '../../web/logs'); // Absoluter Pfad zum Log-Verzeichnis

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

let textSocket;
let DataPluginsSocket;
let autoScanSocket;
let blacklist = [];
let whitelist = [];
let spectrum = [];
let difference = [];
let isScanning = false;
let isSearching = false;
let currentFrequency = 0;
let previousFrequency = 0;
let checkStrengthCounter = 0;
let stereo_detect = false;
let modeValue = defaultScannerMode;
let stereo_forced_user = 'stereo';
let scanInterval = null; 
let autoScanActive = false; 
let autoScanTimer; 
let autoScanScheduled = false; 
let Sensitivity = defaultSensitivityValue;
let ScannerMode = defaultScannerMode;
let ScanHoldTime = defaultScanHoldTime;
let StatusFMLIST = FMLIST_Autolog;
let Scan;
let enabledAntennas = [];
let currentAntennaIndex = 0;
let picode, Savepicode, ps, Saveps, Prevps, freq, Savefreq, strength,  strengthTop, rds, stereo, stereo_forced, ant, station, pol, erp, city, itu, distance, azimuth, stationid, Savestationid, tp, ta, pty, ecc, af, rt0, rt1, rt, saveAutoscanAntenna,saveAutoscanFrequency;
let bandwith = 0;
let CSV_LogfilePath;
let CSV_LogfilePath_filtered;
let HTML_LogfilePath;
let HTML_LogfilePath_filtered;
let textSocketLost;
let scanBandwithSave;
let ALT;
let gpstime;
let gpsmode;
let ShortServerName;
let sigArray = [];
let sigArraySpectrum = [];
let sigArrayDifference = [];
let sigArraySave0 = [];
let sigArraySave1 = [];
let sigArraySave2 = [];
let sigArraySave3 = [];
let validFrequencies;
let freqMap2;
let logFilePathHTML;
let logFilePathCSV;
let writeStatusCSV = true;
writeStatusCSVps = false;
let writeStatusHTMLLog = true;
let writeStatusLogFMLIST = true;

let tuningLimit = config.webserver.tuningLimit;

if (tuningUpperLimit === '') {
    tuningUpperLimit = config.webserver.tuningUpperLimit;
    if (tuningUpperLimit === '' || !tuningLimit) {
        tuningUpperLimit = '108.0';
    }
}
if (parseFloat(tuningUpperLimit) > 108.0) {
    tuningUpperLimit = '108.0';
}

if (tuningLowerLimit === '') {
	tuningLowerLimit = config.webserver.tuningLowerLimit;
	if (tuningLowerLimit === '' || !tuningLimit) {
		tuningLowerLimit = '87.5';
	}
}

Scan = 'off';

if (!FMLIST_OM_ID) {
	FMLIST_OM_ID = config.extras.fmlistOmid;
}

if (FMLIST_Blacklist) {
    const blacklistFile = path.join(__dirname, 'blacklist_fmlist.txt');
    if (fs.existsSync(blacklistFile)) {
        logInfo('Scanner enabled FMLIST Blacklist');
    } else {
        logInfo('Scanner not found blacklist_fmlist.txt');
        FMLIST_Blacklist = false;
    }
}

if (Log_Blacklist) {
    const LogBlacklistFile = path.join(__dirname, 'blacklist_log.txt');
    if (fs.existsSync(LogBlacklistFile)) {
        logInfo('Scanner enabled Log Blacklist');
    } else {
        logInfo('Scanner not found blacklist_log.txt');
        Log_Blacklist = false;
    }
}

if (CSVcreate) {
    const csvFilenamePath = path.join(logDir, 'CSVfilename');
    fs.writeFileSync(csvFilenamePath, 'NoFileName', { flag: 'w' });
    logInfo('Scanner successfully updated /logs/CSVfilename with "NoFileName"');
} else {
    const csvFilenamePath = path.join(logDir, 'CSVfilename');
    if (fs.existsSync(csvFilenamePath)) {
        fs.unlinkSync(csvFilenamePath);
        logInfo('Scanner successfully deleted /logs/CSVfilename');
    }
}

// Create a status message object
function createMessage(status, target, Scan, Search, Sensitivity, ScannerMode, ScanHoldTime, StatusFMLIST, InfoFMLIST) {
    return {
        type: 'Scanner',
        value: {
			status: status,
			ScanPE5PVB: Autoscan_PE5PVB_Mode,
            Scan: Scan,
			SearchPE5PVB: Search_PE5PVB_Mode,
            Search: Search,	 
            Sensitivity: Sensitivity,
            ScannerMode: ScannerMode,
			ScanHoldTime: ScanHoldTime,
			SpectrumLimiterValue: SpectrumLimiterValue,
            StatusFMLIST: StatusFMLIST,
			InfoFMLIST: InfoFMLIST		
        },
        source: source,
        target: target
    };
}

// Serialport status variables
let alreadyWarnedMissingSerialportVars = false;
let getSerialportStatus = null;

(function initSerialportStatusSource() {
  if (
    apiData?.state &&
    typeof apiData.state.isSerialportAlive !== 'undefined' &&
    typeof apiData.state.isSerialportRetrying !== 'undefined'
  ) {
    getSerialportStatus = () => ({
      isAlive: apiData.state.isSerialportAlive,
      isRetrying: apiData.state.isSerialportRetrying
    });
  } else if (
    typeof isSerialportAlive !== 'undefined' &&
    typeof isSerialportRetrying !== 'undefined'
  ) {
    getSerialportStatus = () => ({
      isAlive: isSerialportAlive,
      isRetrying: isSerialportRetrying
    });
    logWarn("Scanner: Older Serialport status variables found.");
  } else {
    if (!alreadyWarnedMissingSerialportVars) {
      alreadyWarnedMissingSerialportVars = true;
      logWarn("Scanner: Serialport status variables not found.");
    }
  }
})();

function checkSerialportStatus() {
  if (!getSerialportStatus) return;

  const { isAlive, isRetrying } = getSerialportStatus();

  if (!isAlive || isRetrying) {
    if (textSocketLost) {
      clearTimeout(textSocketLost);
    }

    textSocketLost = setTimeout(() => {
      logInfo("Scanner connection lost, creating new WebSocket.");
      if (textSocket) {
        try {
          textSocket.close(1000, 'Normal closure');
        } catch (error) {
          logInfo("Error closing WebSocket:", error);
        }
      }
      textSocketLost = null;
    }, 10000);
  }
}


async function TextWebSocket(messageData) {
    let autoScanStopped = false; // Flag to ensure the block runs only once

    if (!textSocket || textSocket.readyState === WebSocket.CLOSED) {
        try {
            textSocket = new WebSocket(`${externalWsUrl}/text`);

            textSocket.onopen = () => {
                logInfo("Scanner connected to WebSocket");
				if (Scan === 'on' && CSVcreate) {
					logFilePathCSV = getLogFilePathCSV(); // Determine the path to the log file based on the current date and time
				}

                if (ScanPE5PVB) {
                    sendCommandToClient(`I${defaultSensitivityValue}`);
                    sendCommandToClient(`K${defaultScanHoldTime}`);
	                logInfo(`Scanner set auto-scan "${StartAutoScan}" sensitivity "${defaultSensitivityValue}" scanholdtime "${defaultScanHoldTime}" (PE5PVB mode)`);
					if (StartAutoScan === 'on' && Autoscan_PE5PVB_Mode) {
						sendCommandToClient('J1');
						logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}" (PE5PVB mode)`);
					}
                } else {
                    logInfo(`Scanner set auto-scan "${StartAutoScan}" sensitivity "${defaultSensitivityValue}" mode "${defaultScannerMode}" scanholdtime "${defaultScanHoldTime}"`);
					if (StartAutoScan === 'on') {
						if (ScannerMode === 'spectrum' || ScannerMode === 'difference') {
							logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Limit: "${SpectrumLimiterValue}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
						} else {
							logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
						}
						setTimeout(() => {
						   Scan = 'on';
						   AutoScan();
						}, 2000);
					}
                }

                textSocket.onmessage = (event) => {
                    try {
                        // Parse the incoming message data
                        const messageData = JSON.parse(event.data);
						// console.log(messageData);

                        checkSerialportStatus();

                        // Execute this block only once
                        const users = messageData.users;  
                        if (StartAutoScan === 'auto' && !autoScanStopped && users > 0) {
                            logInfo(`Scanner stopped auto-scan [User: ${users}]`);
                            autoScanStopped = true; // Set the flag to true after first execution
                        }

                        handleSocketMessage(messageData);  // Pass the parsed data to the handler
                    } catch (error) {
                        logError("Failed to parse WebSocket message:", error);
                    }
                };
            };

            textSocket.onerror = (error) => logError("WebSocket error:", error);

            textSocket.onclose = () => {
                logInfo("Scanner closed WebSocket");
                setTimeout(() => TextWebSocket(messageData), 1000); // Pass messageData when reconnecting
            };

        } catch (error) {
            logError("Scanner Failed to set up WebSocket:", error);
            setTimeout(() => TextWebSocket(messageData), 1000); // Pass messageData when reconnecting
        }
    }
}


function startSearch(direction) {
    // Restart scanning in the specified direction
    clearInterval(scanInterval);

	if (isScanning && isSearching) {
		isScanning = true;
		isSearching = false;
		return;
	} else {
		setTimeout(() => startScan(direction), 150);
		isScanning = false;
		isSearching = true;
	}
}

let lastMessageTimestamp = 0;

async function DataPluginsWebSocket() {
    if (!DataPluginsSocket || DataPluginsSocket.readyState === WebSocket.CLOSED) {
        try {
            DataPluginsSocket = new WebSocket(externalWsUrl + '/data_plugins');

            DataPluginsSocket.onopen = () => {
                logInfo(`Scanner connected to ${externalWsUrl + '/data_plugins'}`);
            };

            DataPluginsSocket.onerror = (error) => {
                logError("WebSocket error:", error);
            };

            DataPluginsSocket.onclose = () => {
                logInfo("Scanner WebSocket closed.");
                setTimeout(DataPluginsWebSocket, 1000); // Increased delay for reconnection
            };

            DataPluginsSocket.onmessage = (event) => {
                try {
					
					const message = JSON.parse(event.data);
                    // console.log("Received message:", message);

                    let responseMessage;
					
					if (message.type === 'Scanner' && message.source !== source) {

                        switch (message.value.status) {
                            case 'request':
                                // Create the response message
                                responseMessage = createMessage(
                                    'response',
                                    message.source,
                                    Scan,
                                    '',
                                    Sensitivity,
                                    ScannerMode,
                                    ScanHoldTime,
									FMLIST_Autolog
                                );

                                // Send the response message
                                DataPluginsSocket.send(JSON.stringify(responseMessage));
                                // logInfo(`Sent response message: ${JSON.stringify(responseMessage)}`);
                                break;
						}
					}									
					
                    const currentTime = Date.now();
                    if (currentTime - lastMessageTimestamp < 50) {
                        // Ignore the message if it's received within 500 ms of the last processed message
                        return;
                    }
                    lastMessageTimestamp = currentTime;  
					
					if (message.type === 'sigArray' && message.isScanning) {
				
						sigArray = message.value; // Save sigArray					
						
						const primaryFrequencies = sigArray.filter(entry => {
							const hasSecondDecimalZero = Math.round(entry.freq * 100) % 10 === 0;
							return entry.sig > SpectrumLimiterValue && hasSecondDecimalZero;
						});

						let extendedFrequencies = [];

						primaryFrequencies.forEach(primary => {
							const freq = parseFloat(primary.freq); // Ensure freq is a number
							if (isNaN(freq)) {
								logError("Scanner invalid frequency:", primary.freq);
								return; // Skip invalid frequencies
							}

							const lowerBound = parseFloat((freq - 0.1).toFixed(2));
							const upperBound = parseFloat((freq + 0.1).toFixed(2));

							// Decide based on the signal value of the primary frequency
							if (primary.sig >= SpectrumPlusMinusValue) {
								// Add frequencies in the range of the primary frequency
								const inRange = sigArray.filter(entry => {
									const entryFreq = parseFloat(entry.freq); // Ensure entry.freq is a number
									return entryFreq >= lowerBound && entryFreq <= upperBound;
								});
								extendedFrequencies.push(...inRange);
							}
						});
				
						// Remove duplicate entries from extended frequencies
						extendedFrequencies = Array.from(
							new Map(extendedFrequencies.map(item => [item.freq, item])).values()
						);

						// Capture all remaining frequencies that are not part of extendedFrequencies or marked as primary frequency
						sigArraySpectrum = sigArray.filter(entry => {
							const isInExtendedFrequencies = extendedFrequencies.some(ext => ext.freq === entry.freq);
							const isPrimary = primaryFrequencies.some(primary => primary.freq === entry.freq);
							return !isInExtendedFrequencies && !isPrimary;
						});

						// console.log("Primary Frequencies:", primaryFrequencies);
						// console.log("Extended Frequencies:", extendedFrequencies);
						// console.log("Excluded Frequencies (sigArraySpectrum):", sigArraySpectrum);

						sigArrayDifference = sigArraySpectrum;

						// console.log('Filtered sigArraySpectrum:', sigArraySpectrum);

						// Step 2: Filter sigArrayDifference to only include items whose freq is not in sigArraySave
						// or whose sig differs by more than ±SpectrumChangeValue from the corresponding freq in sigArraySave
						
						if (currentAntennaIndex === 0) {
							freqMap2 = new Map(
								sigArraySave0.map(item => [parseFloat(item.freq), parseFloat(item.sig)])
							);
						}
						
						if (currentAntennaIndex === 1) {
							freqMap2 = new Map(
								sigArraySave1.map(item => [parseFloat(item.freq), parseFloat(item.sig)])
							);
						}
						if (currentAntennaIndex === 2) {
							freqMap2 = new Map(
								sigArraySave2.map(item => [parseFloat(item.freq), parseFloat(item.sig)])
							);
						}
						
						if (currentAntennaIndex === 3) {
							freqMap2 = new Map(
								sigArraySave3.map(item => [parseFloat(item.freq), parseFloat(item.sig)])
							);
						}
						
						sigArrayDifference = sigArrayDifference.filter(item => {
							
							const freq = parseFloat(item.freq);
							const sig = parseFloat(item.sig);
							
							if (sig < Sensitivity) {
								return false;
							}

							if (!freqMap2.has(freq)) {
								return true; // Frequency not found in sigArraySave
							}

							const sig2 = freqMap2.get(freq);
							return Math.abs(sig - sig2) > SpectrumChangeValue; // Absolute difference in sig is more than SpectrumChangeValue
							
							
						});
	
						// Step 3: Copy the current content of sigArraySpectrum into sigArraySave for comparison
						if (currentAntennaIndex === 0) {
							sigArraySave0 = Array.from(sigArray || []); // Ensure sigArraySpectrum exists before copying
						}

						if (currentAntennaIndex === 1) {
							sigArraySave1 = Array.from(sigArray || []); // Ensure sigArraySpectrum exists before copying
						}		

						if (currentAntennaIndex === 2) {
							sigArraySave2 = Array.from(sigArray || []); // Ensure sigArraySpectrum exists before copying
						}	

						if (currentAntennaIndex === 3) {
							sigArraySave3 = Array.from(sigArray || []); // Ensure sigArraySpectrum exists before copying
						}						
									
						// console.log('sigArraySave (for comparison):', sigArraySave);
						// console.log('Filtered sigArrayDifference:', sigArrayDifference);
						
					}

                        switch (message.value.status) {
                            case 'command':
	                            if (message.value.Sensitivity !== undefined && message.value.Sensitivity !== '') {
                                    Sensitivity = message.value.Sensitivity;
									if (ScanPE5PVB) {        
										sendCommandToClient(`I${Sensitivity}`);
										logInfo(`Scanner (PE5PVB mode) set sensitivity "${Sensitivity}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner set sensitivity "${Sensitivity}" [IP: ${message.source}]`);
									}
                                }
                                if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'normal') {
                                    ScannerMode = message.value.ScannerMode;
									logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
                                }
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'blacklist' && EnableBlacklist) {
									if (blacklist.length > 0) {
										ScannerMode = message.value.ScannerMode;
										logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner mode "${message.value.ScannerMode}" not available! [IP: ${message.source}]`);
										ScannerMode = 'normal';			
										
										responseMessage = createMessage(
											'response',
											message.source,
											Scan,
											'',
											Sensitivity,
											ScannerMode,
											ScanHoldTime,
											SpectrumLimiterValue,
											FMLIST_Autolog
										);
								
										DataPluginsSocket.send(JSON.stringify(responseMessage));
									}
								}
								if (message.value.ScannerMode !== undefined && message.value.ScannerMode === 'whitelist' && EnableWhitelist) {
									if (whitelist.length > 0) {
										ScannerMode = message.value.ScannerMode;
										logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner mode "${message.value.ScannerMode}" not available! [IP: ${message.source}]`);
										ScannerMode = 'normal';			
										
										responseMessage = createMessage(
											'response',
											message.source,
											Scan,
											'',
											Sensitivity,
											ScannerMode,
											ScanHoldTime,
											SpectrumLimiterValue,
											FMLIST_Autolog
										);
								
										DataPluginsSocket.send(JSON.stringify(responseMessage));
									}
								}
								if (message.value.ScannerMode !== undefined && (message.value.ScannerMode === 'spectrum' && EnableSpectrumScan || message.value.ScannerMode === 'spectrumBL' && EnableSpectrumScan && EnableBlacklist || message.value.ScannerMode === 'difference' && EnableDifferenceScan || message.value.ScannerMode === 'differenceBL' && EnableDifferenceScan && EnableBlacklist)) {
										ScannerMode = message.value.ScannerMode;
										logInfo(`Scanner set mode "${ScannerMode}" [IP: ${message.source}]`);
										
										responseMessage = createMessage(
											'response',
											message.source,
											Scan,
											'',
											Sensitivity,
											ScannerMode,
											ScanHoldTime,
											SpectrumLimiterValue,
											FMLIST_Autolog
										);
								
										DataPluginsSocket.send(JSON.stringify(responseMessage));

										if (sigArray.length === 0) { // Check if signal array is empty
											currentFrequency = tuningLowerLimit; // Set to start spectrum analysis frequency
											sendDataToClient(currentFrequency); // Send the updated frequency to the client
											startSpectrumAnalyse(); // Start spectrum analysis
										}

								}
                                if (message.value.ScanHoldTime !== undefined && message.value.ScanHoldTime !== '') {
                                    ScanHoldTime = message.value.ScanHoldTime;
									if (ScanPE5PVB) {        
										sendCommandToClient(`K${ScanHoldTime}`);
										logInfo(`Scanner (PE5PVB mode) set scanholdtime "${ScanHoldTime}" [IP: ${message.source}]`);
									} else {
										logInfo(`Scanner set scanholdtime "${ScanHoldTime}" [IP: ${message.source}]`);
									}
                                }
                                if (message.value.Search === 'down') {
									if (SearchPE5PVB) {
										sendCommandToClient('C1');
										// logInfo(`Scanner (PE5PVB mode) search down [IP: ${message.source}]`);
									} else {
										startSearch('down');
										// logInfo(`Scanner search down [IP: ${message.source}]`);
									}
                                }
                                if (message.value.Search === 'up') {
									if (SearchPE5PVB) {
										sendCommandToClient('C2');
										// logInfo(`Scanner (PE5PVB mode) search up [IP: ${message.source}] `);
									} else {
										startSearch('up');
										// logInfo(`Scanner search up [IP: ${message.source}]`);
									}
                                }
															
                                if (message.value.Scan === 'on' && Scan === 'off') {
					
									Scan = message.value.Scan;
									DataPluginsSocket.send(JSON.stringify(responseMessage));
									
									if (CSVcreate) {
										logFilePathCSV = getLogFilePathCSV(); // Determine the path to the log file based on the current date and time
									}
									
									if (ScanPE5PVB) {
										logInfo(`Scanner (PE5PVB mode) starts auto-scan [IP: ${message.source}]`);
										logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}"`);
									    sendCommandToClient('J1');
									} else {
										logInfo(`Scanner starts auto-scan [IP: ${message.source}]`);
										if (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL') {
											logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Limit: "${SpectrumLimiterValue}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
										} else {
											logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
										}
										AutoScan();
									}
																	
                                }
                                if (message.value.Scan === 'off' && Scan === 'on') {

									Scan = message.value.Scan;
									DataPluginsSocket.send(JSON.stringify(responseMessage));
									
									if (ScanPE5PVB) {
										logInfo(`Scanner (PE5PVB mode) stops auto-scan [${message.source}]`);
									    sendCommandToClient('J0');
									} else {
										logInfo(`Scanner stops auto-scan [IP: ${message.source}]`);
										stopAutoScan();
									}
                                }                             
								
                                break;

                            default:
                                //logError(`Unknown status type: ${message.value.status}`);
                                break;
                        }
					
					// Check if the dataset is of type GPS
					if (message.type === 'GPS') {
						const gpsData = message.value;
						//console.log(gpsData);
						const { status, time, lat, lon, alt, mode } = gpsData;

							LAT = lat;
							LON = lon;
							ALT = alt;
							gpsmode = mode;
							gpstime = time;
							
					}
				
                } catch (error) {
                    //logError("Failed to handle message:", error);
                }
            };

        } catch (error) {
            logError("Failed to set up WebSocket:", error);
            setTimeout(DataPluginsWebSocket, 1000); // Increased delay for reconnection
        }
    }
}

function InitialMessage() {
    const ws = new WebSocket(externalWsUrl + '/data_plugins');
    ws.on('open', () => {
        // logInfo(`Scanner connected to ${ws.url}`);	
        ws.send(JSON.stringify(createMessage('broadcast', '255.255.255.255', 'off', 'off', defaultSensitivityValue, defaultScannerMode, defaultScanHoldTime, FMLIST_Autolog))); // Send initial status
    });
}

function sendDataToClient(frequency) {
    if (textSocket && textSocket.readyState === WebSocket.OPEN) {
        const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
        textSocket.send(dataToSend);
    } else {
        logError('WebSocket not open.');
        setTimeout(() => sendDataToClient(frequency), 100); // Retry after a short delay
    }
}

async function sendCommandToClient(command) {
    try {
        // Ensure the TextWebSocket connection is established
        await TextWebSocket();

        if (textSocket && textSocket.readyState === WebSocket.OPEN) {
        //    logInfo("WebSocket connected, sending command");
            sendCommand(textSocket, command);
        } else {
            logError("WebSocket is not open. Unable to send command.");
        }
    } catch (error) {
        logError("Failed to send command to client:", error);
    }
}


function sendCommand(socket, command) {
    // logInfo("Scanner send command:", command);
    socket.send(command);
}

function StatusInfoFMLIST() {
	if (FMLIST_CanLogServer) {
		getLogInterval()
	} else {
		if (FMLIST_Autolog === 'on') {
			logInfo(`Scanner activated FMLIST Logging "all mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km and ${FMLIST_LogInterval} Min. Interval`);
		}
		if (FMLIST_Autolog === 'auto') {
			logInfo(`Scanner activated FMLIST Logging with "auto mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km and ${FMLIST_LogInterval} Min. Interval`);
		}
	}
}

let counter = 0; // Declare the counter variable

function checkUserCount(users) {

    // Check if the conditions for starting the auto-scan are met
    if (users === 0) {
        counter++; // Increment the counter when users === 0
        if (counter >= 15) { // Check if the counter has reached 15
            if (!autoScanActive && StartAutoScan === 'auto') {
                if (!autoScanScheduled) {
                    // Set a timeout to start the auto-scan after 10 seconds
                    autoScanTimer = setTimeout(() => {	
                        // Activate auto-scan
                        autoScanActive = true;  
                        Scan = 'on';

                        // Create and send a broadcast message to start the scan
                        const Message = createMessage(
                            'broadcast',
                            '255.255.255.255',
                            Scan,
                            '',
                            Sensitivity,
                            ScannerMode,
                            ScanHoldTime,
							FMLIST_Autolog
                        );

                        if (users === 0) {

                            DataPluginsSocket.send(JSON.stringify(Message));
							saveAutoscanFrequency = currentFrequency;
							
							if (AntennaSwitch && apiData.initialData.ant) saveAutoscanAntenna = apiData.initialData.ant;
							
							if (currentFrequency > '74.00') {

								// Multiply to isolate the second decimal place
								const secondDecimalPlace = Math.floor((currentFrequency * 100) % 10);

								// Round based on the second decimal place
								if (secondDecimalPlace <= 5) {
									// Round down
									currentFrequency = Math.floor(currentFrequency * 10) / 10; // Round to one decimal place down
								} else {
									// Round up
									currentFrequency = Math.ceil(currentFrequency * 10) / 10; // Round to one decimal place up
								}

								// Format to two decimal places
								currentFrequency = currentFrequency.toFixed(2); 

								sendDataToClient(currentFrequency);
								
							}
													
                            // Log and handle the scan based on the mode
                            if (ScanPE5PVB) {
                                logInfo(`Scanner (PE5PVB mode) starts auto-scan automatically [User: ${users}]`);
                                logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Scanholdtime: "${ScanHoldTime}"`);
                                sendCommandToClient('J1');
                            } else {
                                logInfo(`Scanner starts auto-scan automatically [User: ${users}]`);
								if (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL') {
									logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Limit: "${SpectrumLimiterValue}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
								} else {
									logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
								}
															
                                isScanning = false;
                                AutoScan();								

                            }
							
							if (BEEP_CONTROL) {
								fs.createReadStream('./plugins/Scanner/sounds/beep_long.wav').pipe(new Speaker());
							}
                                
                            // Reset the scheduling flag
                            autoScanScheduled = false;
                        }
                    }, 10000); // 10000 milliseconds = 10 seconds

                    // Set the scheduling flag to prevent overlapping timeouts
                    autoScanScheduled = true;
                }
            }
            counter = 0; // Reset the counter after processing
        }
    } else if (users > 0) {
        counter = 0;
        if (autoScanActive && StartAutoScan === 'auto') {  // If there are users, auto-scan is active, and StartAutoScan is set to 'auto'
            // Deactivate auto-scan
            autoScanActive = false; 
            Scan = 'off';

            // Create and send a broadcast message to stop the scan
            const Message = createMessage(
                'broadcast',
                '255.255.255.255',
                Scan,
                '',
                Sensitivity,
                ScannerMode,
                ScanHoldTime,
				FMLIST_Autolog
            );
            DataPluginsSocket.send(JSON.stringify(Message));

            // Log and handle the scan stop based on the mode
            if (ScanPE5PVB) {
                logInfo(`Scanner (PE5PVB mode) stopped automatically auto-scan [User: ${users}]`);
                sendCommandToClient('J0');
            } else {
                logInfo(`Scanner stopped automatically auto-scan [User: ${users}]`);
                stopAutoScan();
            }
			
			if (BEEP_CONTROL) {
				setTimeout(() => {
					fs.createReadStream('./plugins/Scanner/sounds/beep_short_double.wav')
						.pipe(new Speaker());
				}, 500);
			}
     
			if (DefaultFreq !== '' && enableDefaultFreq) {
				sendDataToClient(DefaultFreq);
			} else {
				sendDataToClient(saveAutoscanFrequency);
			}
			if (AntennaSwitch && saveAutoscanAntenna) textSocket.send(`Z${saveAutoscanAntenna}`);
        }
    }
}

// Variable to cache the file content
let cachedData = null;

async function fetchstationid(freq, picode, city) {
    try {
        // Check if data is already cached
        if (!cachedData) {
            // Fetch the content from the specified URL if not cached
            const response = await fetch("https://tef.noobish.eu/logos/scripts/StationID_PL.txt");

            // Check if the response is successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Read the text content from the response
            cachedData = await response.text();
        } else {
            // logInfo('Scanner Info: Using cached data.');
        }

        // Remove the period from freq
        const cleanedFreq = freq.replace('.', '');

        // Remove all special characters from city and convert to lowercase
        const cleanedCity = city.replace(/[^a-z]/gi, '').toLowerCase();

        // Extract the first four characters of the cleaned city
        const cityPrefix = cleanedCity.substring(0, 3);

        // Create a pattern with wildcards around each of the first four characters of the cleaned city
        const cityPattern = cityPrefix
            .split('')
            .map(char => `.*${char}`)
            .join('');
        
        // Build the target string based on the provided variables with wildcards
        const targetString = `${cleanedFreq};${picode};${cityPattern}.*`;
        // logInfo(`Scanner Info: Searching for specified combination: ${targetString}`);

        // Create a case-insensitive regular expression to match the target string
        const regex = new RegExp(targetString, 'i');

        // Find the line that matches the target regex
        const targetLine = cachedData.split('\n').find(line => regex.test(line));

        if (targetLine) {
            // Split the line by semicolons to get all the parts
            const parts = targetLine.split(';');

            // Extract and clean the station ID from the last column
            let StationID = parts[parts.length - 1].trim();

            // Further cleaning can be done here if needed (e.g., removing specific characters)
            StationID = StationID.replace(/[^0-9]/g, ''); // Example: remove all non-alphanumeric characters

            // logInfo(`Station ID: ${StationID}`);
            return StationID;
        } else {
            // logInfo(`Scanner Info: The specified combination of ${cleanedFreq};*${picode}*;*${cityPattern}* was not found in the stationid_PL.txt.`);
            return null;
        }
    } catch (error) {
        logError('Scanner Error:', error);
        return null;
    }
}


async function handleSocketMessage(messageData) {
    const txInfo = messageData.txInfo;

    // Now you don't need to use setTimeout, unless you need an explicit delay
    picode = messageData.pi;
    ps = messageData.ps;
    freq = messageData.freq;
	ecc = messageData.ecc;
	af = String(messageData.af).replace(/,/g, ';');
	rt0	= messageData.rt0;
	rt1	= messageData.rt1;
    strength = messageData.sig;
	strengthTop = messageData.sigTop;
	rds = messageData.rds;
    stereo = messageData.st;
	bandwith = messageData.bw;
    users = messageData.users;
    stereo_forced = messageData.stForced;
    ant = messageData.ant;
	ta = messageData.ta;
	tp = messageData.tp;
	pty = messageData.pty;
	
	if (Scanmode === 1 ) {
		
	    station = messageData.txInfo.tx;
		city = messageData.txInfo.city;
		itu = messageData.txInfo.itu;
		distance = messageData.txInfo.dist;
		azimuth = messageData.txInfo.azi;
		pol = messageData.txInfo.pol;
		erp = messageData.txInfo.erp;
	
	} else {
		
		station = '';
		city = '';
		itu = '';
		distance = '';
		azimuth = '';
		pol = '';
		erp = '';
		
	}
	
	//Filter for PIcode 0000
	if (picode.includes('0000')) {
		picode = '?';
	}
		
	if (bandwith === "-1") {
		bandwith = "0";
	}
	
	if (bandwith === -1) {
		bandwith = 0;
	}
	  
    // Determine station ID for Polish stations
    if (itu === "POL") {
        stationid = await fetchstationid(freq, picode, city); 
	} else {
        stationid = messageData.txInfo.id;
    }
	
	if (Scanmode === 0 ) {
		stationid = 'offline';
	}
	   
	if (messageData.ps_errors && typeof messageData.ps_errors === 'string' && /\b(5|6|7|8|9|10)\b/.test(messageData.ps_errors)) {
		ps += "?";
	}
	
	if (ps === "") {
		ps = "?";
	}
	
	if (!rt0 && rt1) {
		rt = rt1;
		} else if (!rt1 && rt0) {
			rt = rt0;
			} else if (rt0 && rt1) {
				rt = `${rt0} ${rt1}`;
			} else {
				rt ='';
			}

	if (ecc === null) {
		ecc = '';
	}
	
    if (isScanning) {
        if (stereo_forced && stereo_forced_user !== 'mono') {
            stereo_forced_user = 'mono';
            sendCommandToClient('B0');
        }
    } else {
        if (stereo_forced_user === 'mono') {
            sendCommandToClient('B1');
            stereo_forced_user = 'stereo'; // Update stereo_forced_user after sending 'B1'
        }
    }

    if (freq !== previousFrequency) {
        checkStrengthCounter = 0;
        stereo_detect = false;
    }
    
    previousFrequency = freq;
    currentFrequency = freq;
    checkStrengthCounter++;
    
    if (checkStrengthCounter > 3) {
        if (stereo) {
            stereo_detect = true;
        }
    }

    if (!ScanPE5PVB) {
        checkStereo(stereo_detect, freq, strength, picode, station, checkStrengthCounter);
    } else {
		PE5PVBlog(freq, picode, station, checkStrengthCounter)
	}

    // Check user count and handle scanning if needed
    checkUserCount(users);
}



function initializeAntennas(Antennas) {
    try {

        // Initialize the list of enabled antennas
        enabledAntennas = [];
        for (let i = 1; i <= 4; i++) {
            const antenna = Antennas[`ant${i}`];
            if (antenna && antenna.enabled) {
                enabledAntennas.push({
                    number: i,
                    name: antenna.name
                });
            }
        }

        // Set the current index to 0 if there are valid antennas
        if (enabledAntennas.length > 0) {
            logInfo('Scanner activated automatic antenna switching');
            currentAntennaIndex = 0;
        } else {
            currentAntennaIndex = 0; // This else is redundant, but kept for clarity
        }
    } catch (error) {
        logError('Scanner Error initializing antennas:', error.message);
    }
}


// Function to send the command to the next activated antenna
function sendNextAntennaCommand() {

    if (enabledAntennas.length < 2 || AntennaSwitch !== 'on') {
        // No need to switch if there's only one or no active antennas
        // console.log('No need to switch antennas.');
        return;
    }

    const ant = enabledAntennas[currentAntennaIndex];
    logInfo(`Scanner switched to antenna ${ant.number - 1}: ${ant.name}`);
    sendCommandToClient(`Z${ant.number - 1}`); // Z0 to Z3 for ant1 to ant4

    // Move to the next index
    currentAntennaIndex = (currentAntennaIndex + 1) % enabledAntennas.length;
}


function AutoScan() {
    if (!isScanning) {
		if (scanBandwith === '0' || scanBandwith === 0) {
			if (bandwith !== '0' && bandwith !== 0) {
				logInfo('Scanner set bandwith from:', bandwith, 'Hz to: auto mode');
			}
		} else {
			if (bandwith === '0' || bandwith === 0) {
				logInfo('Scanner set bandwith from: auto mode to:', scanBandwith,  'Hz');
			} else {
				logInfo('Scanner set bandwith from:', bandwith, 'Hz to:', scanBandwith,  'Hz');
			}
		}
		scanBandwithSave = bandwith;
		textSocket.send(`W${scanBandwith}\n`);
        startScan('up');		// Start scanning once
	}
}

function stopAutoScan() {
	clearInterval(scanInterval); // Stops the scan interval
	if (scanBandwithSave === '0' || scanBandwithSave === 0) {
		if (scanBandwith !== '0' && scanBandwith !== 0) {
			logInfo('Scanner set bandwith from:', scanBandwith, 'Hz back to: auto mode');
		}			
	} else {
		if (scanBandwith === '0' || scanBandwith === 0) {
			logInfo('Scanner set bandwith from: auto mode back to:', scanBandwithSave, 'Hz');
		}		
	}
	textSocket.send(`W${scanBandwithSave}\n`);
}

let isSpectrumCooldown = false;
async function setupSendSocket() {

    return new Promise((resolve, reject) => {
        const message = JSON.stringify({
            type: 'spectrum-graph',
            value: {
                status: 'scan',
                ip: '127.0.0.1',
            },
        });

        setTimeout(() => {
            if (isSpectrumCooldown) { // Prevent Spectrum Graph socket spam if no signals detected
                return;
            }

            isSpectrumCooldown = true;

            DataPluginsSocket.send(message);

            setTimeout(() => {
                isSpectrumCooldown = false;
            }, 8000);
        }, 400); 

    });
}


async function startSpectrumAnalyse() {
    try {
        await setupSendSocket(); // Wait for WebSocket processing
        if (sigArray.length > 0) {
            sigArray.forEach(item => {
                //logInfo(`freq: ${item.freq}, sig: ${item.sig}`);
            });
        } else {
            //logInfo('No data in sigArray.');
        }
    } catch (error) {
        //console.error('Error during WebSocket communication:', error.message);
    }
}

function startScan(direction) {
    clearInterval(scanInterval); // Stops any active scan interval from the previous scan
    
    // If the current frequency is invalid (NaN) or zero, set it to the lower tuning limit
    if (isNaN(currentFrequency) || currentFrequency === 0.0) {
        currentFrequency = tuningLowerLimit;
    }

    // Function to update the frequency during the scan
    function updateFrequency() {
		
        if (!isScanning) {
            //logInfo('Scanning has been stopped.'); // Log that scanning was stopped
            return; // Exit the function if scanning is stopped
        }

        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places
        
        // If scanning upwards
        if (direction === 'up' ) {
            if (currentFrequency < 74.00) {
                currentFrequency += 0.01; // Increase by 0.01 if frequency is less than 74 MHz
            } else {
				if (Scan === 'on' && ScannerMode === 'whitelist' && EnableWhitelist) {		
					currentFrequency += 0.01; // Decrease by 0.01 above 74 MHz
				} else {
					currentFrequency += 0.1; // Decrease by 0.1 above 74 MHz
				}
            }
            // If the frequency exceeds the upper limit, reset to the lower limit
            if (currentFrequency > tuningUpperLimit) {
                if (Scan === 'on' && ScannerMode !== 'spectrum' && ScannerMode !== 'spectrumBL' && ScannerMode !== 'difference' && ScannerMode !== 'differenceBL') {
                    sendNextAntennaCommand(); // Send the next antenna command
                    if (BEEP_CONTROL) {
                        // Play a beep sound when reaching the upper limit
                        setTimeout(() => {
							fs.createReadStream('./plugins/Scanner/sounds/beep_short_double.wav')
								.pipe(new Speaker());
						}, 500);
                    }
                }
                if (ScannerMode !== 'spectrum' && ScannerMode !== 'spectrumBL' && ScannerMode !== 'difference' && ScannerMode !== 'differenceBL') {
					currentFrequency = tuningLowerLimit; // Reset to the lower limit
				}
            }
        } 
		
        // If scanning downwards
        else if (direction === 'down') {
            if (currentFrequency < 74.00) {
                currentFrequency -= 0.01; // Decrease by 0.01 if frequency is less than 74 MHz
            } else {
				if (Scan === 'on' && ScannerMode === 'whitelist' && EnableWhitelist) {		
					currentFrequency -= 0.01; // Decrease by 0.01 above 74 MHz
				} else {
					currentFrequency -= 0.1; // Decrease by 0.1 above 74 MHz
				}
            }

            // If the frequency goes below the lower limit, reset to the upper limit
            if (currentFrequency < tuningLowerLimit) {
                currentFrequency = tuningUpperLimit; // Reset to the upper limit
            }
        }

        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places

        // Handle blacklist mode
        if (!ScanPE5PVB) {
            if (ScannerMode === 'blacklist' && Scan === 'on' && EnableBlacklist) {
                while (isInBlacklist(currentFrequency, blacklist)) { 
                    // Skip over frequencies that are in the blacklist
                    if (direction === 'up') {
                        if (currentFrequency < 74.00) {
                            currentFrequency += 0.01;
                        } else {
                            currentFrequency += 0.1;
                        }
                        if (currentFrequency > tuningUpperLimit) {
                            currentFrequency = tuningLowerLimit;
                        }
                    } else if (direction === 'down') {
                        if (currentFrequency < 74.00) {
                            currentFrequency -= 0.01;
                        } else {
                            currentFrequency -= 0.1;
                        }
                        if (currentFrequency < tuningLowerLimit) {
                            currentFrequency = tuningUpperLimit;
                        }
                    }
                    currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places
                }
            } 

			// Handle whitelist mode
			else if (ScannerMode === 'whitelist' && Scan === 'on' && EnableWhitelist) {		

				while (!isInWhitelist(currentFrequency, whitelist)) { 

					// Track the previous frequency before changing the current frequency
					const tempPreviousFrequency = currentFrequency;

					// Only scan frequencies in the whitelist
					if (direction === 'up') {
							currentFrequency += 0.01;
						if (currentFrequency > tuningUpperLimit) {
							currentFrequency = tuningLowerLimit;
						}
					} else if (direction === 'down') {
							currentFrequency -= 0.01;
						if (currentFrequency < tuningLowerLimit) {
							currentFrequency = tuningUpperLimit;
						}
					}

					currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places

					// Check if current frequency is smaller than the previous frequency
					if (currentFrequency < tempPreviousFrequency) {
						sendNextAntennaCommand(); // Send the next antenna command
					}			
					
				}
			}
	
            else if (Scan === 'on' && sigArray.length !== 0 && (ScannerMode === 'spectrum' && EnableSpectrumScan || ScannerMode === 'spectrumBL' && EnableSpectrumScanBL || ScannerMode === 'difference' && EnableDifferenceScan || ScannerMode === 'differenceBL' && EnableDifferenceScanBL)) {
                    // Filter valid frequencies based on the signal strength and sensitivity
					// console.log(sigArraySpectrum);
					
					if (ScannerMode === 'spectrum') {
						validFrequencies = sigArraySpectrum
							.filter(item => parseFloat(item.sig) > Sensitivity && parseFloat(item.sig) < SpectrumLimiterValue)
							.map(item => parseFloat(item.freq));
					}
					
					if (ScannerMode === 'spectrumBL' && EnableSpectrumScanBL) {
						validFrequencies = sigArraySpectrum
							.filter(item => 
								parseFloat(item.sig) > Sensitivity &&
								parseFloat(item.sig) < SpectrumLimiterValue &&
								!isInBlacklist(parseFloat(item.freq), blacklist)
							)
							.map(item => parseFloat(item.freq));
					}
					
					if (ScannerMode === 'difference') {
						validFrequencies = sigArrayDifference
							.filter(item => parseFloat(item.sig) > Sensitivity && parseFloat(item.sig) < SpectrumLimiterValue)
							.map(item => parseFloat(item.freq));
					}
					
					if (ScannerMode === 'differenceBL' && EnableDifferenceScanBL) {
						validFrequencies = sigArrayDifference
							.filter(item => 
								parseFloat(item.sig) > Sensitivity && 
								parseFloat(item.sig) < SpectrumLimiterValue &&
								!isInBlacklist(parseFloat(item.freq), blacklist)
							)
						.map(item => parseFloat(item.freq));
					}				
				
                    // Keep updating the frequency until it matches a valid frequency
                    while (!validFrequencies.includes(currentFrequency) || (Number(parseFloat(currentFrequency).toFixed(1)) === Number((parseFloat(tuningUpperLimit) + 0.1).toFixed(1)))) {
                        if (direction === 'up') {
                            if (currentFrequency < 74.00) {
                                currentFrequency += 0.01;
                            } else {
                                currentFrequency += 0.1;
                            }					
                            if (currentFrequency > tuningUpperLimit) {
								currentFrequency = tuningLowerLimit; // Set to start spectrum analysis frequency
								sendNextAntennaCommand(); // Send the next antenna command						
								if (BEEP_CONTROL) {
								// Play a beep sound when reaching the upper limit
									setTimeout(() => {
										fs.createReadStream('./plugins/Scanner/sounds/beep_short_double.wav')
											.pipe(new Speaker());
									}, 500);
								}
								
								sendDataToClient(currentFrequency); // Send the updated frequency to the client
								sigArray = [];

								function performSpectrumAnalysis() {
									if (sigArray.length === 0) {
										startSpectrumAnalyse(); // Trigger spectrum analysis
									} else {
										clearInterval(intervalId); // Stop the interval when sigArray is no longer zero-bit
										return; // Exit further processing in this cycle
									}
								}

								performSpectrumAnalysis();
								let intervalId = setInterval(performSpectrumAnalysis, 5000);
								return; // Exit further processing in this cycle
                            }
                        } else if (direction === 'down') {
                            if (currentFrequency < 74.00) {
                                currentFrequency -= 0.01;
                            } else {
                                currentFrequency -= 0.1;
                            }
                            if (currentFrequency < tuningLowerLimit) {
                                currentFrequency = tuningUpperLimit; // Reset to the upper limit
                            }
                        }

                        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places

                        // Exit the loop once a valid frequency is found
                        if (validFrequencies.includes(currentFrequency)) {
                            break;
                        }
                    }
             }
        }
		
		if ((ScannerMode === 'spectrum' && EnableSpectrumScan || ScannerMode === 'spectrumBL' && EnableSpectrumScanBL || ScannerMode === 'difference' && EnableDifferenceScan || ScannerMode === 'differenceBL' && EnableDifferenceScanBL) && Scan === 'on' && sigArray.length !== 0 && Sensitivity > SpectrumLimiterValue) {
			logError(`Scanner Error: ${Sensitivity}>${SpectrumLimiterValue } ---> Sensitivity must be smaller than SpectrumLimiter!`);
		}

        if (Scan === 'on' && (ScannerMode === 'spectrum' && EnableSpectrumScan || ScannerMode === 'spectrumBL' && EnableSpectrumScanBL || ScannerMode === 'difference' && EnableDifferenceScan || ScannerMode === 'differenceBL' && EnableDifferenceScanBL)) {
			if (sigArray.length !== 0 && Sensitivity < SpectrumLimiterValue) {
				sendDataToClient(currentFrequency); // Send the updated frequency to the client
			}
		} else {
			//console.log('sendDataToClient',currentFrequency)
			sendDataToClient(currentFrequency); // Send the updated frequency to the client
		}
    }

    isScanning = true; // Mark scanning as in progress
    updateFrequency(); // Call update frequency once before starting the interval
    scanInterval = setInterval(updateFrequency, scanIntervalTime); // Set up the scanning interval
}

function isInBlacklist(frequency, blacklist) {
    return blacklist.some(f => Math.abs(f - frequency) < 0.05); // Allow small tolerance for floating-point comparisons
}

function isInWhitelist(frequency, whitelist) {
    const roundedFrequency = Math.round(frequency * 100) / 100;
    return whitelist.some(f => Math.round(f * 100) / 100 === roundedFrequency);
}


function checkBlacklist() {
	
    if (!EnableBlacklist) {
        logInfo('Blacklist is not enabled. Skipping check.');
        return;
    }
    // Determine the path to the file relative to the current directory
    const filePath = path.join(__dirname, '../Scanner/blacklist.txt');

    // Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logInfo('Scanner checking Blacklist: not found');
            blacklist = [];
            return;
        }

		blacklist = data.split('\n')
		.map(frequency => frequency.trim())
		.filter(Boolean);

		blacklist = blacklist.map(value => {
		// Check if the value has a decimal point and enough digits
		if (value.includes('.')) {
			return parseFloat(value).toFixed(value.split('.')[1].length);
		}
			return value;
		});
        logInfo('Scanner initialized Blacklist');
    });
}

function checkWhitelist() {
    // Check if the whitelist feature is enabled
    if (!EnableWhitelist) {
        logInfo('Whitelist is not enabled. Skipping check.');
        return;
    }
	
    // Determine the path to the file relative to the current directory
    const filePath = path.join(__dirname, '../Scanner/whitelist.txt');

    // Read the file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logInfo('Scanner checking Whitelist: not found');
            whitelist = [];
            return;
        }

		whitelist = data.split('\n')
		.map(frequency => frequency.trim())
		.filter(Boolean);

		whitelist = whitelist.map(value => {
		// Check if the value has a decimal point and enough digits
		if (value.includes('.')) {
			return parseFloat(value).toFixed(value.split('.')[1].length);
		}
			return value;
		});
        logInfo('Scanner initialized Whitelist');
    });
}

		function checkSpectrum() {
		// Check if the whitelist feature is enabled
			if (!EnableWhitelist) {
				logInfo('Whitelist is not enabled. Skipping check.');
				return;
			}
		}
		
		
       function checkStereo(stereo_detect, freq, strength, picode, station, checkStrengthCounter) {
		        
			let ScanHoldTimeValue = ScanHoldTime * 10;

            if (stereo_detect === true || picode.length > 1 || !isSearching && (ScannerMode === 'spectrum' && Scan === 'on' || ScannerMode === 'spectrumBL' && Scan === 'on' || ScannerMode === 'difference' || ScannerMode === 'differenceBL' && Scan === 'on' )) {

                if (strength > Sensitivity || picode.length > 1 || !isSearching &&  (ScannerMode === 'spectrum' && Scan === 'on' || ScannerMode === 'spectrumBL' && Scan === 'on' || ScannerMode === 'difference' || ScannerMode === 'differenceBL' && Scan === 'on' )) {					
					//console.log(strength, Sensitivity);

                    if (picode.length > 1 && ScannerMode !== 'spectrum' && ScannerMode !== 'spectrumBL' && ScannerMode !== 'difference' && ScannerMode !== 'differenceBL') {
                        ScanHoldTimeValue += 50;
                    }				
					
					let tuningLowerLimitwith00 = Math.round(tuningLowerLimit * 100) / 100;
					let formattedNumber = tuningLowerLimitwith00.toFixed(3);

				    //console.log(checkStrengthCounter,ScanHoldTimeValue,currentFrequency,formattedNumber);	
					if (currentFrequency !== formattedNumber) {
						clearInterval(scanInterval); // Clears a previously defined scanning interval
						isScanning = false; // Updates a flag indicating scanning status		
					}

							if (HTMLlogRAW && (Savepicode !== picode || Saveps !== ps || Savestationid !== stationid) && picode !== '?') {								
									writeHTMLLogEntry(false); // activate non filtered log
									Savepicode = picode;
									Saveps = ps;
									Savestationid = stationid;
							}			
		
							if (Scan === 'on') {
								
								date = new Date().toLocaleDateString();
								time = new Date().toLocaleTimeString();				
								
								if (checkStrengthCounter > ScanHoldTimeValue || (OnlyScanHoldTime === 'off' && ps.length > 1 && !ps.includes('?') && (Scanmode === 0 || (stationid && Scanmode === 1))))  {

										if (picode !== '' && picode !== '?' && !picode.includes('??') && !picode.includes('???') && freq !== Savefreq) {
											
											if ((CSVcompletePS && CSVcreate && !ps.includes('?')) || (!CSVcompletePS && CSVcreate && Savefreq !== freq)) {
												writeCSVLogEntry(); // filtered log
											}
											
											if ((!HTMLlogRAW && stationid && HTMLlogOnlyID) || (!HTMLlogRAW && !HTMLlogOnlyID)) {
												writeHTMLLogEntry(true); // filtered log
											}
											
											if ((FMLIST_Autolog === 'on' || FMLIST_Autolog === 'auto') && stationid ) {
												writeLogFMLIST(stationid, station, itu, city, distance, freq); 
											}
												
										}
										
											//isScanning = false;
											checkStrengthCounter = 0; // Reset the counter
											stereo_detect = false;
											station = '';
											Savefreq = freq;
											startScan('up'); // Restart scanning after the delay						
                                } 
															
                 			} else {
							
								if (freq !== Savefreq) {
									writeStatusCSV = true;
									writeStatusHTMLLog = true;
									writeStatusLogFMLIST = true;
									writeStatusCSVps = true;
								}	
																	
								if (picode.length > 1 && picode !== '' && picode !== '?' && !picode.includes('??') && !picode.includes('???')) {
									
									if (!ps.includes('?') && writeStatusCSVps && !CSVcompletePS && CSVcreate) {
										writeCSVLogEntry(); // filtered log
										writeStatusCSVps = false;
									}
									if ((writeStatusCSV && CSVcreate && !ps.includes('?') && CSVcompletePS) || (writeStatusCSVps && CSVcreate && !CSVcompletePS)) {
										writeCSVLogEntry(); // filtered log
										writeStatusCSV = false;
									}
									if ((!HTMLlogRAW && stationid && HTMLlogOnlyID && writeStatusHTMLLog) || (!HTMLlogRAW && !HTMLlogOnlyID && writeStatusHTMLLog)){
										writeHTMLLogEntry(true); // filtered log
										writeStatusHTMLLog = false;
									}
									if ((FMLIST_Autolog === 'on' || FMLIST_Autolog === 'auto') && stationid && writeStatusLogFMLIST) {
										writeLogFMLIST(stationid, station, itu, city, distance, freq); 
										writeStatusLogFMLIST = false;
									}
									Savefreq = freq;
								}
							}
							isScanning = false;
							
                } else {

					if (Scan === 'on') {
						if (checkStrengthCounter > 10) {
							clearInterval(scanInterval); // Clears a previously defined scanning interval
							stereo_detect = false;
							isScanning = false; // Updates a flag indicating scanning status
							startScan('up');
						}
					}				
                }
            } else {

				if (Scan === 'on') {
                    if (checkStrengthCounter > 10) {
                        clearInterval(scanInterval); // Clears a previously defined scanning interval
                        isScanning = false; // Updates a flag indicating scanning status
                        stereo_detect = false;
                        startScan('up');
                    }
				}
            }
        }	
		
      function PE5PVBlog(freq, picode, station, checkStrengthCounter) {
		  
			let ScanHoldTimeValue = ScanHoldTime * 6;	
		                                  
            if (picode.length > 1) {

							if ((Savepicode !== picode || Saveps !== ps || Savestationid !== stationid) && picode !== '?') {						
								if (HTMLlogRAW) {
									writeHTMLLogEntry(false); // activate non filtered log
									Savepicode = picode;
									Saveps = ps;
									Savestationid = stationid;
								}
							}			

							if (Scan === 'on') {
								
								date = new Date().toLocaleDateString();
								time = new Date().toLocaleTimeString();						

								if (ps.length > 1 && !ps.includes('?') && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq || checkStrengthCounter > ScanHoldTimeValue && freq !== Savefreq) {
											writeCSVLogEntry(true); // filtered log
											if (!HTMLlogRAW) {
												writeHTMLLogEntry(true); // filtered log
											}
											
											if (FMLIST_Autolog === 'on' || FMLIST_Autolog === 'auto') {
												writeLogFMLIST(stationid, station, itu, city, distance, freq); 
											}
											
											Savefreq = freq;	
								}

								station = '';	
																
                 			} else {
								
								if (ps.length > 1 && !ps.includes('?') && picode.length > 1 && picode !== '?' && !picode.includes('??') && !picode.includes('???') && stationid && freq !== Savefreq || checkStrengthCounter > ScanHoldTimeValue && freq !== Savefreq) {
									writeCSVLogEntry(true); // filtered log
									if (!HTMLlogRAW) {
										writeHTMLLogEntry(true); // filtered log
									}
									
									if (FMLIST_Autolog === 'on') {
												writeLogFMLIST(stationid, station, itu, city, distance, freq); 
										}
									
									Savefreq = freq;
								}
							}								              
            }
        }	
				
// Function to find the appropriate entry based on `pty`
function getProgrammeByPTYFromFile(pty, baseDir, relativePath) {
    try {
        const filePath = path.resolve(baseDir, relativePath);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const arrayMatch = fileContent.match(/const europe_programmes\s*=\s*\[([\s\S]*?)\];/);
        if (!arrayMatch) {
            throw new Error("The array 'europe_programmes' could not be found.");
        }

        const arrayString = `[${arrayMatch[1]}]`;
        const europeProgrammes = JSON.parse(arrayString);

        if (pty >= 0 && pty < europeProgrammes.length) {
            return europeProgrammes[pty];
        } else {
            throw new Error(`Invalid PTY value. Must be between 0 and ${europeProgrammes.length - 1}.`);
        }
    } catch (error) {
        logError(`Error processing the file ${relativePath}: ${error.message}`);
        return null; // Return a default value or handle as appropriate
    }
}

	
function getLogFilePathCSV(date, time, filename) {
    const { utcDate, utcTime } = getCurrentUTC(); // Get current time in UTC
    time = utcTime;
    date = utcDate;
    
    // Convert the UTC time to "THHMMSS" format
    const formattedTime = `T${time.replace(/:/g, '')}`;
    
    // Construct the file name, e.g., "20250327T123456_fm_rds.csv"
    const fileName = `${date}${formattedTime}_fm_rds.csv`;
    
    // Create the full path to the log file
    const filePath = path.join(logDir, fileName);

    // Check if the log directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // If the file does not exist, create it
    if (!fs.existsSync(filePath)) {
        // Adjust the header content as per your requirements
        let formattedServerDescription = ServerDescription.replace(/\n/g, '\\n'); // Handle special characters
        let header = ``; // Header content, adjust if necessary
      
        try {
            fs.writeFileSync(filePath, header, { flag: 'w' });
            logInfo('Scanner created /logs/' + fileName);

            // If CSVcreate is true, write the current fileName to the "CSVfilename" file in the log directory
            if (CSVcreate) {
                const csvFilenamePath = path.join(logDir, 'CSVfilename');
                fs.writeFileSync(csvFilenamePath, fileName, { flag: 'w' });
                logInfo('CSVfilename file successfully updated with the filename');
            }
        } catch (error) {
            logError('Failed to create /logs/' + fileName, ':', error.message);
        }
    }
    
    return filePath;
}


let lastFrequencyInHz = null;

function writeCSVLogEntry() {
    if (isInBlacklist(freq, blacklist) && EnableBlacklist && ((Scan === 'on' && (ScannerMode === 'blacklist' || ScannerMode === 'spectrumBL' || ScannerMode === 'differenceBL')))) {
        return;
    }
	
	// --- Blacklist check ---
	if (Log_Blacklist) {
		let Logblacklist = [];
		try {
			const raw = fs.readFileSync(path.join(__dirname, 'blacklist_log.txt'), 'utf8');
			Logblacklist = raw
				.split(/\r?\n/)               // split into lines
				.map(line => line.trim())     // trim whitespace
				.filter(line => line && !line.startsWith('#')); // ignore empty lines and comments
		} catch (err) {
			logError('Scanner could not load blacklist_log.txt:', err);
		}

		// Build keys: "freq,picode", "freq" only, and "picode" only
		const freqKey  = parseFloat(freq).toFixed(3);
		const piKey    = typeof picode !== 'undefined' ? picode.toString() : '';
		const comboKey = `${freqKey};${piKey}`;

		if (Logblacklist.includes(comboKey)) {  // exact freq+PI match
			//logInfo(`${comboKey} was found in blacklist_log.txt`);
			return;
		}
		
		if (Logblacklist.includes(freqKey)) {  // frequency-only match
			//logInfo(`${freqKey} was found in blacklist_log.txt`);
			return;
		}
		
		if (Logblacklist.includes(piKey)) {  // PI-only match
			//logInfo(`${piKey} was found in blacklist_log.txt`);
			return;
		}	
		
	}
	// --- End blacklist check ---	
    
    const now = new Date();
    let date = now.toISOString().split('T')[0];  // YYYY-MM-DD
    let time = now.toTimeString().split(' ')[0];   // HH:MM:SS
    
    const { utcDate, utcTime } = getCurrentUTC(); // Get time in UTC
    time = utcTime;
    date = utcDate;

    if (!fs.existsSync(logFilePathCSV)) {
        // Falls Datei nicht existiert, neuen Pfad holen
        logFilePathCSV = getLogFilePathCSV();
    }
    
    // Datenaufbereitung für FMLIST
    const [seconds, nanoseconds] = process.hrtime(); // Gibt [seconds, nanoseconds] zurück
    const nanoString = nanoseconds.toString().padStart(9, '0'); // Auf 9 Stellen auffüllen
    const dateTimeStringNanoSeconds = `${date}T${time.slice(0, -1)}${nanoString} Z`;
    
    const dateTimeString = `${date}T${time}`;
    const dateObject = new Date(dateTimeString);
    const UNIXTIME = Math.floor(dateObject.getTime() / 1000);

    const FREQTEXT = `freq`;
    const numericFrequency = parseFloat(freq);
    const frequencyInHz = Math.round(numericFrequency * 1_000_000);
    const rdson = rds ? 1 : 0;   
    
    SignalStrengthUnitLowerCase = SignalStrengthUnit.toLowerCase();
    
    let numericStrengthTop;
    let numericStrength;
    if (SignalStrengthUnitLowerCase === 'dbµv') {
        numericStrengthTop = parseFloat(strengthTop) - 10.875;
        numericStrength = parseFloat(strength) - 10.875;
    } else if (SignalStrengthUnitLowerCase === 'dbm') {
        numericStrengthTop = parseFloat(strengthTop) - 108.75;
        numericStrength = parseFloat(strength) - 108.75;
    } else {
        numericStrengthTop = parseFloat(strengthTop);
        numericStrength = parseFloat(strength);
    }
    
    const SNRMIN = numericStrength.toFixed(2);
    const SNRMAX = numericStrengthTop.toFixed(2);
    
    const GPSLAT = LAT || config.identification.lat;
    const GPSLON = LON || config.identification.lon;
    const GPSALT = ALT || '';
    const GPSMODE = gpsmode || '';
    const GPSTIME = gpstime || new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');  

    const PI = `0x${picode}`;
    const PS = `"${ps}"`;
    const TA = `${ta}`;
    const TP = `${tp}`;
    
    const MUSIC = `0`;
    const ProgramType = `"${getProgrammeByPTYFromFile(pty, __dirname, './../../web/js/main.js')}"`;
    const GRP = `"0A"`;
    const STEREO = stereo ? 1 : 0;  
    const DYNPTY = `0`;
    const OTHERPI = ``;
    const ALLPSTEXT = `"allps:"`;
    const OTHERPS = `""`;
    const ECC = `"${ecc}"`;
    const STATIONID = `"${stationid}"`;
    const AF = `"${af}"`;
    const RT = `"${rt}"`;

    // Erzeuge die Log-Zeile als String
    const newLine = `${UNIXTIME},${FREQTEXT},${frequencyInHz},${rdson},${SNRMIN},${SNRMAX},${dateTimeStringNanoSeconds},${GPSLAT},${GPSLON},${GPSMODE},${GPSALT},${GPSTIME},${PI},1,${PS},1,${TA},${TP},${MUSIC},${ProgramType},${GRP},${STEREO},${DYNPTY},${OTHERPI},,${ALLPSTEXT},${OTHERPS},,${ECC},${STATIONID},${AF},${RT}\n`;

    try {
		if (CSVcreate) {
			if (!CSVcompletePS) {
				// Wenn CSVcompletePS false ist, dann:
				if (lastFrequencyInHz !== null && lastFrequencyInHz === frequencyInHz) {
					// Falls der Frequenzwert unverändert ist,
					// Aktualisiere die letzte Zeile der CSV-Datei.
					const fileContent = fs.readFileSync(logFilePathCSV, 'utf8');
					const lines = fileContent.split('\n');
					// Entferne ggf. ein leeres Element am Ende
					if (lines[lines.length - 1] === '') {
						lines.pop();
					}
					// Ersetze die letzte Zeile durch newLine (ohne zusätzliches \n, da wir es später hinzufügen)

					lines[lines.length - 1] = newLine.trim();						
					fs.writeFileSync(logFilePathCSV, lines.join('\n') + '\n');
				
				} else {
					// Frequenz hat sich geändert – schreibe eine neue Zeile an
					fs.appendFileSync(logFilePathCSV, newLine, { flag: 'a' });
					lastFrequencyInHz = frequencyInHz;
				}
			} else {
				// Falls CSVcompletePS true ist, verhalte dich wie bisher: immer neue Zeile anhängen
				fs.appendFileSync(logFilePathCSV, newLine, { flag: 'a' });
			}
		}
        
        if (BEEP_CONTROL && Scan === 'on') {
            fs.createReadStream('./plugins/Scanner/sounds/beep_short.wav')
              .pipe(new Speaker());
        }
    } catch (error) {
        logError("Failed to write log entry:", error.message);
    }
}

function getLogFilePathHTML(date, time, isFiltered) {
    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }
    
    // Determine the filename based on the isFiltered flag
    const fileName = isFiltered ? `SCANNER_${date}_filtered.html` : `SCANNER_${date}.html`;
    
    // Create the full path to the file
    const filePath = path.join(logDir, fileName);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Check if the file exists; if not, create it
    if (!fs.existsSync(filePath)) {
        let header = '';

        try {
            // Read the contents of the FilteredTemplate.html file
            const templateFilePath = path.join(__dirname, 'FilteredTemplate.html');
            if (fs.existsSync(templateFilePath)) {
                const templateContent = fs.readFileSync(templateFilePath, 'utf8');
                header += templateContent;
            } else {
                logError('FilteredTemplate.html does not exist');
                // Handle the case where the template file is missing
            }
        } catch (error) {
            logError('Failed to read FilteredTemplate.html:', error.message);
        }

        header += `${ServerName}<br>${ServerDescription}<br>`;
        
		if (HTMLOnlyFirstLog) {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time} (UTC)<br><br>` : `SCANNER LOG (FIRST LOG) ${date} ${time} (UTC)<br><br>`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE - FIRST LOG) ${date} ${time}<br><br>` : `SCANNER LOG (FIRST LOG) ${date} ${time}<br><br>`; 
			}
		} else {
			if (UTCtime) {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time} (UTC)<br><br>` : `SCANNER LOG ${date} ${time} (UTC)<br><br>`; 
			} else {
				header += isFiltered ? `SCANNER LOG (FILTER MODE) ${date} ${time}<br><br>` : `SCANNER LOG ${date} ${time}<br><br>`; 
			}
		}
		
        header += UTCtime 
            ? `<table border="1"><tr><th>DATE</th><th>TIME(UTC)</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>ANT</th><th>P</th><th>ERP(kW)</th><th>STRENGTH(${SignalStrengthUnit})</th><th>DIST(km)</th><th>AZ(°)</th><th>ID</th><th>AUTOLOG</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n` 
            : `<table border="1"><tr><th>DATE</th><th>TIME</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>ANT</th><th>P</th><th>ERP(kW)</th><th>STRENGTH(${SignalStrengthUnit})</th><th>DIST(km)</th><th>AZ(°)</th><th>ID</th><th>AUTOLOG</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n`;

        try {
            fs.writeFileSync(filePath, header, { flag: 'w' });
            logInfo('Scanner created /logs/' + fileName);
        } catch (error) {
            logError('Failed to create /logs/' + fileName, ':', error.message);
        }
    }

    return filePath;
}

const CORS_PROXY_URL = 'https://cors-proxy.de:13128/';
const FM_API_TOKEN   = '924924';

/**
 * Öffnet den Stream für die gegebene Station-ID
 */
function openStream(stationId) {
  const endpoint = `https://api.fmlist.org/152/fmdxGetStreamById.php?id=${stationId}&token=${FM_API_TOKEN}`;
  fetch(CORS_PROXY_URL + endpoint)
    .then(resp => {
      if (!resp.ok) throw new Error(`API-Error ${resp.status}`);
      return resp.json();
    })
    .then(streams => {
      if (!Array.isArray(streams) || streams.length === 0) {
        console.warn('Keine Streams gefunden für ID', stationId);
        return;
      }
      // Stream mit höchster Bitrate wählen
      const best = streams.reduce((prev, curr) =>
        parseInt(curr.bitrate, 10) > parseInt(prev.bitrate, 10) ? curr : prev
      );
      const win = window.open(best.linkname, 'streamWindow', 'width=800,height=160');
      if (win) win.focus();
    })
    .catch(e => console.error('Fehler beim Laden des Streams:', e));
}

function writeHTMLLogEntry(isFiltered) {

	const antennaNumber = (+ant) + 1;
	const match = enabledAntennas.find(a => a.number === antennaNumber);
	const antennaName = match?.name ?? 'AntA';
  	
	// --- Blacklist check ---
	if (Log_Blacklist) {
		let Logblacklist = [];
		try {
			const raw = fs.readFileSync(path.join(__dirname, 'blacklist_log.txt'), 'utf8');
			Logblacklist = raw
				.split(/\r?\n/)               // split into lines
				.map(line => line.trim())     // trim whitespace
				.filter(line => line && !line.startsWith('#')); // ignore empty lines and comments
		} catch (err) {
			logError('Scanner could not load blacklist_log.txt:', err);
		}

		// Build keys: "freq,picode", "freq" only, and "picode" only
		const freqKey  = parseFloat(freq).toFixed(3);
		const piKey    = typeof picode !== 'undefined' ? picode.toString() : '';
		const comboKey = `${freqKey};${piKey}`;

		if (Logblacklist.includes(comboKey)) {  // exact freq+PI match
			//logInfo(`${comboKey} was found in blacklist_log.txt`);
			return;
		}
		
		if (Logblacklist.includes(freqKey)) {  // frequency-only match
			//logInfo(`${freqKey} was found in blacklist_log.txt`);
			return;
		}
		
		if (Logblacklist.includes(piKey)) {  // PI-only match
			//logInfo(`${piKey} was found in blacklist_log.txt`);
			return;
		}	
		
	}
	// --- End blacklist check ---	
    
    const now = new Date();
    let date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    let time = now.toTimeString().split(' ')[0]; // HH-MM-SS

    if (UTCtime) {
        const { utcDate, utcTime } = getCurrentUTC(); // time in UTC
        time = utcTime;
        date = utcDate;
    }

  SignalStrengthUnitLowerCase = SignalStrengthUnit.toLowerCase();

	let numericStrength;
	if (SignalStrengthUnitLowerCase === 'dbµv') {
		numericStrength = parseFloat(strength) - 10.875;
	} else if (SignalStrengthUnitLowerCase === 'dbm') {
		numericStrength = parseFloat(strength) - 108.75;
	} else {
		numericStrength = parseFloat(strength);
	}
	
	const SNR = numericStrength.toFixed(1);
	
    logFilePathHTML = getLogFilePathHTML(date, time, isFiltered);

	let link1 = stationid !== '' && stationid !== 'offline' ? `<a href="#" onclick="window.open('https://fmscan.org/stream.php?i=${stationid}', 'newWindow', 'width=800,height=160'); return false;" target="_blank">STREAM</a>` : '';     
	let link2 = stationid !== '' && stationid !== 'offline' ? `<a href="https://maps.fmdx.org/#qth=${LAT},${LON}&id=${stationid}&findId=*" target="_blank">MAP</a>` : '';     
	let link3 = stationid !== '' && stationid !== 'offline' && stationid > 0 && FMLIST_OM_ID !== '' ? `<a href="https://www.fmlist.org/fi_inslog.php?lfd=${stationid}&qrb=${distance}&qtf=${azimuth}&country=${itu}&omid=${FMLIST_OM_ID}" target="_blank">FMLIST</a>` : '';

    let psWithUnderscores = ps.replace(/ /g, '_');
	let scanmode = 'no'
	
	if (Scan === 'on') {
		scanmode = 'yes'
	}	

    let line = `<tr><td>${date}</td><td>${time}</td><td>${freq}</td><td>${picode}</td><td>${psWithUnderscores}</td><td>${station}</td><td>${city}</td><td>${itu}</td><td>${antennaName}</td><td>${pol}</td><td>${erp}</td><td>${SNR}</td><td>${distance}</td><td>${azimuth}</td><td>${stationid}</td><td>${scanmode}</td><td>${link1}</td><td>${link2}</td><td>${link3}</td></tr>\n`;

    let logContent = '';
    if (fs.existsSync(logFilePathHTML)) {
        try {
            logContent = fs.readFileSync(logFilePathHTML, 'utf8');
        } catch (error) {
            logError("Failed to read log file:", error.message);
            return;
        }
    }

    if (HTMLOnlyFirstLog) {
        const entryExists = logContent.includes(`<td>${freq}</td>`) && logContent.includes(`<td>${picode}</td>`) && logContent.includes(`<td>${station}</td>`);
        if (entryExists) {
            return;
        }
    }

    // Ensure the log ends correctly for every entry
    const endTag = '</pre></body></html>';
    let updatedContent = logContent.replace(new RegExp(`${endTag}$`), '');

    // Add the new line
    updatedContent += line;

    // Append the end tag after the last entry
    updatedContent += endTag;

    try {
        fs.writeFileSync(logFilePathHTML, updatedContent, 'utf8');
    } catch (error) {
        logError("Failed to update the log file:", error.message);
    }
}

function getCurrentUTC() {
    // Get the current time in UTC
    const now = new Date();
    
    // Extract the UTC year, month, and day
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Month is zero-based
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    // Extract the UTC hours, minutes, and seconds
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    // Format the date and time
    const utcDate = `${year}-${month}-${day}`;
    const utcTime = `${hours}:${minutes}:${seconds}`;

    // Return an object with date and time
    return { utcDate, utcTime };
}

// Function to fetch and evaluate the LogInterval for FMLIST
async function getLogInterval() {
    try {
        // Send a GET request to the server endpoint
        const response = await fetch(`http://${FMLIST_CanLogServer}/loginterval/fmlist`);

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP-Error! Status: ${response.status}`);
        }

        // Parse the JSON object from the server response
        const data = await response.json();

        // Access and use the LogInterval_FMLIST value
        const logIntervalFMLIST = data.LogInterval_FMLIST;
        // LogInfo(`The LogInterval for FMLIST is: ${logIntervalFMLIST} minutes`);
		FMLIST_LogInterval = logIntervalFMLIST;
		
		if (FMLIST_Autolog === 'on') {
			logInfo(`Scanner activated FMLIST Logging "all mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km`); 
			logInfo(`Scanner activated CanLogServer ${FMLIST_CanLogServer} with ${FMLIST_LogInterval} Min. Logging interval`);
		}
		
		if (FMLIST_Autolog === 'auto') {
			logInfo(`Scanner activated FMLIST Logging with "auto mode" with ${FMLIST_MinDistance} km < Distance < ${FMLIST_MaxDistance} km`); 
			logInfo(`Scanner activated CanLogServer ${FMLIST_CanLogServer} with ${FMLIST_LogInterval} Min. Logging interval`);
		}
       
    } catch (error) {
        logError('DX-Alert Error fetching the LogInterval:', error);
    }
}


// Server function to check if the ID has been logged recently
async function CanLogServer(stationid) {
    try {
        // Send a POST request to the Express server
        const response = await fetch(`http://${FMLIST_CanLogServer}/fmlist/${stationid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check the HTTP status code
        if (response.ok) {
            return true; // Exit if the station was logged recently
        } else {
            // If the response is not OK, log the error message
			const FMLISTlog = `FMLIST Log ${station}[${itu}] from ${city}[${distance} km] on ${freq} MHz`;
            logInfo(`${FMLISTlog} was already recently logged on CanLogServer`);

            // Create and send a broadcast message
            const message = createMessage(
                'broadcast', // Message type
                '255.255.255.255', // Broadcast IP address
                '', // Placeholder for additional fields
                '',
                '',
                '',
                '',
                FMLIST_Autolog, // Auto-log flag
                `FMLIST Log failed! ID ${stationid} was already recently logged on CanLogServer.` // Message content
            );

            DataPluginsSocket.send(JSON.stringify(message)); // Send the broadcast message
            return false; // Exit if the station was logged recently
        }
    } catch (error) {
        // If the server is unreachable, this block will be executed
        logError(`Scanner error: CanLogServer ${FMLIST_CanLogServer} is unreachable`);

        // Create and send a broadcast message
        const message = createMessage(
            'broadcast', // Message type
            '255.255.255.255', // Broadcast IP address
            '', // Placeholder for additional fields
            '',
            '',
            '',
            '',
            FMLIST_Autolog, // Auto-log flag
            `FMLIST Log failed! CanLogServer ${FMLIST_CanLogServer} is unreachable` // Message content
        );

        DataPluginsSocket.send(JSON.stringify(message)); // Send the broadcast message
        return false; // Station was not logged
    }
}

// Function to check if the ID has been logged within the specified minutes
const logHistory = {};

function canLog(stationid, station, itu, city, distance, freq) {
    const now = Date.now();
    if (FMLIST_LogInterval < 3600 || FMLIST_LogInterval === '' || FMLIST_LogInterval === undefined) {
        FMLIST_LogInterval = 3600;
    }
    const logMinutes = 60 * FMLIST_LogInterval * 1000; // 60 minutes in milliseconds
    if (logHistory[stationid] && (now - logHistory[stationid]) < logMinutes) {
		
        const FMLISTlog = `FMLIST Log ${station}[${itu}] from ${city}[${distance} km] on ${freq} MHz`;
        logInfo(`${FMLISTlog} was already logged recently`);
        // Create and send a broadcast message
        const message = createMessage(
            'broadcast', // Message type
            '255.255.255.255', // Broadcast IP address
            '', // Placeholder for additional fields
            '',
            '',
            '',
            '',
            FMLIST_Autolog, // Auto-log flag
            `FMLIST Log failed! ID ${stationid} was already logged recently.` // Message content
        );
        DataPluginsSocket.send(JSON.stringify(message)); // Send the broadcast message
        
        return false; // Logging denied if less than 60 minutes have passed
    }
    logHistory[stationid] = now; // Update with the current timestamp
    return true;
}

// Function to log to FMLIST
async function writeLogFMLIST(stationid, station, itu, city, distance, freq) {
	
	// Convert freq to a number
	freq = parseFloat(freq);

	if (freq > 74.00) {
		// First, round to one decimal place
		let rounded = Number(freq.toFixed(1));
		// Then, format it as a string with two decimal places
		freq = rounded.toFixed(2);
	}
    
    if (FMLIST_MinDistance < 200 || FMLIST_MinDistance === '' || FMLIST_MinDistance === undefined) {
        FMLIST_MinDistance = 200;
    }
    
    if (FMLIST_MaxDistance < 200 || FMLIST_MaxDistance === '' || FMLIST_MaxDistance === undefined) {
        FMLIST_MaxDistance = 2000;
    }
    
    // Check if the distance is within the specified minimum and maximum limits
    if (distance < FMLIST_MinDistance || distance > FMLIST_MaxDistance) {
        return; // Exit the function if the distance is out of range
    }
    
    // Ensure that a station ID is provided
    if (!stationid) {
        return; // Exit if station ID is missing
    }
	
	// --- Blacklist check ---
	if (FMLIST_Blacklist) {
		let blacklist = [];
		try {
			const raw = fs.readFileSync(path.join(__dirname, 'blacklist_fmlist.txt'), 'utf8');
			blacklist = raw
				.split(/\r?\n/)               // split into lines
				.map(line => line.trim())     // trim whitespace
				.filter(line => line && !line.startsWith('#')); // ignore empty lines and comments
		} catch (err) {
			logError('Scanner could not load blacklist_fmlist.txt:', err);
		}

		// Build keys: "freq,picode", "freq" only, and "picode" only
		const freqKey  = parseFloat(freq).toFixed(3);
		const piKey    = typeof picode !== 'undefined' ? picode.toString() : '';
		const comboKey = `${freqKey};${piKey}`;

		if (blacklist.includes(comboKey)) {  // exact freq+PI match
			logInfo(`${comboKey} was found in blacklist_fmlist.txt`);
			return; // abort immediately if blacklisted
		}
		
		if (blacklist.includes(freqKey)) {  // frequency-only match
			logInfo(`${freqKey} was found in blacklist_fmlist.txt`);
			return; // abort immediately if blacklisted
		}
		
		if (blacklist.includes(piKey)) {  // PI-only match
			logInfo(`${piKey} was found in blacklist_fmlist.txt`);
			return; // abort immediately if blacklisted
		}	
		
	}
    // --- End blacklist check ---
       
    // Check if logging for the specified station ID can continue from CanLog Server
    if (FMLIST_CanLogServer) {
        const canLogResult = await CanLogServer(stationid); // Wait for the result from CanLogServer
        if (!canLogResult) {
            return; // Exit function if the station was logged recently
        }
    } else {
        // Check if logging for the specified station ID can continue
        if (!canLog(stationid, station, itu, city, distance, freq)) {
            return; // Exit function if the station was logged recently
        }
    }
          	  
    // Safely handle the signal strength value
    let signalValue = strength; // Retrieve the signal strength

    // Check if signalValue is not a number, and attempt to convert it
    if (typeof signalValue !== 'number') {
        signalValue = parseFloat(signalValue); // Convert to float if it's not a number
    }

    // If signalValue is still not a number, handle the error
    if (isNaN(signalValue)) {
        logInfo('Signal value is not a valid number:', dataHandler.sig); // Log an error message
        return; // Exit the function if the value is invalid
    }
	
    // Convert signal to dBµV instead of dBf
    signalValue = (signalValue - 11.25).toFixed(0);  // Convert to dBµV

    // Log antenna name if antenna switch is enabled
    let loggedAntenna = '';
    if (Antennas.enabled) {
        const antIndex = parseInt(apiData.initialData.ant) + 1;
        const antName = Antennas[`ant${antIndex}`]?.name;
        loggedAntenna = `, Antenna: ` + antName;
    }
    
	FMLIST_ShortServerName = FMLIST_ShortServerName.substring(0, 10);	
	if (FMLIST_ShortServerName === '') {
		if (ServerName === '') {
			ShortServerName = `Autologged PS: `;
		} else {
			ShortServerName = `${ServerName} autologged PS: `;
		}
	} else {
		if (FMLIST_ShortServerName === 'Autologged') {
			ShortServerName = `Autologged PS: `;
		} else {
			ShortServerName = `${FMLIST_ShortServerName} autologged PS: `;
		}
	}
		
	// Determine the type based on distance
	const type = distance < 900 ? 'tropo' : 'sporadice';
	
    // Prepare the data to be sent in the POST request
	const postData = JSON.stringify({
		station: {
			freq: freq,
			pi: picode,
			id: stationid,
			rds_ps: ps.replace(/'/g, "\\'"),
			signal: signalValue,
			tp: tp,
			ta: ta,
			af_list: af
		},
		server: {
			uuid: config.identification.token,
			latitude: config.identification.lat,
			longitude: config.identification.lon,
			address: config.identification.proxyIp.length > 1
			? config.identification.proxyIp
			: ('Matches request IP with port ' + config.webserver.port),
			webserver_name: config.identification.tunerName.replace(/'/g, "\\'"),
			omid: FMLIST_OM_ID
		},
		type: type,  // Use the computed value for type
		log_msg: `${ShortServerName} ${ps.replace(/\s+/g, '_')}, PI: ${picode}, Signal: ${signalValue} dBµV ${loggedAntenna}`
	});
	

    // Define the options for the HTTPS request
    const options = {
        hostname: 'api.fmlist.org', // API hostname
        path: '/fmdx.org/slog.php', // API path
        method: 'POST', // HTTP method
        headers: {
            'Content-Type': 'application/json', // Content type of the request
            'Content-Length': Buffer.byteLength(postData) // Use Buffer.byteLength for accurate content length
        }
    };

    // Create the HTTPS request
    const request = https.request(options, (response) => {
        let data = '';

        // Collect response data chunks
        response.on('data', (chunk) => {
            data += chunk; // Append each chunk to the data variable
        });

        // Handle the end of the response
        response.on('end', () => {
            if (data.includes('OK!')) { // Check if the response contains 'OK!'
			
				const FMLISTlog = `FMLIST Log ${station}[${itu}] from ${city}[${distance} km] on ${freq} MHz`;
                logInfo(`${FMLISTlog} successful`);
                // Create and send a broadcast message
                const message = createMessage(
                    'broadcast', // Message type
                    '255.255.255.255', // Broadcast IP address
                    '', // Placeholder for additional fields
                    '',
                    '',
                    '',
                    '',
                    FMLIST_Autolog, // Auto-log flag
                    `FMLIST Log successful.` // Message content
                );
                DataPluginsSocket.send(JSON.stringify(message)); // Send the broadcast message
            }
        });
    });

    // Handle errors in the request
    request.on('error', (error) => {
        logError('Scanner Log to FMLIST:', error); // Log the error
    });

    // Write the postData to the request and end it properly
    request.write(postData);
    request.end();
}

InitialMessage();
DataPluginsWebSocket();
TextWebSocket();
checkBlacklist();
checkWhitelist();
StatusInfoFMLIST();
setTimeout(() => {
    initializeAntennas(Antennas);
    sendNextAntennaCommand();
}, 500);