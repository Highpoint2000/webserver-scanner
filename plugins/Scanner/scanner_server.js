///////////////////////////////////////////////////////////////
///                                                         ///
///  SCANNER SERVER SCRIPT FOR FM-DX-WEBSERVER (V4.0b)      ///
///                                                         ///
///  by Highpoint               last update: 25.02.2026     ///
///  powered by PE5PVB                                      ///
///                                                         ///
///  https://github.com/Highpoint2000/webserver-scanner     ///
///                                                         ///
///////////////////////////////////////////////////////////////

/// Use Scanner wizard: https://tef.noobish.eu/logos/scanner_wizard.html for configuration the Plugin !!!

const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Import crypto module
const { logInfo, logError, logWarn } = require('./../../server/console');
const apiData = require('./../../server/datahandler');

let pluginsApi, wss, pluginsWss, serverConfig;
let emitPluginEvent = () => {};
let sendPrivilegedCommand = null;
let useHooks = false;

try {
    pluginsApi = require('./../../server/plugins_api');

    if (pluginsApi?.emitPluginEvent) {
        emitPluginEvent = pluginsApi.emitPluginEvent;
    }

    wss = pluginsApi.getWss?.();
    pluginsWss = pluginsApi.getPluginsWss?.();
    serverConfig = pluginsApi.getServerConfig?.();

    pluginsWss.on('connection', handlePluginConnection);

    if (pluginsApi?.sendPrivilegedCommand) {
        sendPrivilegedCommand = pluginsApi.sendPrivilegedCommand;
    }

    useHooks = !!(wss && pluginsWss);
    usePrivileged = !!sendPrivilegedCommand && useHooks;

    if (useHooks && usePrivileged) {
        logInfo(`Scanner using plugins_api with WebSocket hooks enabled`);
    }

    if (pluginsApi?.onPluginEvent) {
        pluginsApi.onPluginEvent('sigArray', (data) => {
            handleDataPluginsMessage(JSON.stringify({
                type: 'sigArray',
                value: data,
                isScanning: true
            }), null);
        });
    }
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        logWarn('Scanner unable to find plugins_api, using fallback');
    } else {
        throw err; // unexpected error
    }
}

// Define the paths to the old and new configuration files
const oldConfigFilePath = path.join(__dirname, 'configPlugin.json');
const newConfigFilePath = path.join(__dirname, './../../plugins_configs/scanner.json');
const dxAlertConfigFilePath = path.join(__dirname, './../../plugins_configs/DX-Alert.json');

// Default values for the configuration file
const defaultConfig = {
    Scanmode: 1,                         	// 0 - offline mode or 1 - online mode
    Autoscan_PE5PVB_Mode: false,        	// Set to 'true' if ESP32 with PE5PVB firmware is being used and you want to use the auto scan mode of the firmware. Set it 'true' for FMDX Scanner Mode!
    Search_PE5PVB_Mode: false,           	// Set to "true" if ESP32 with PE5PVB firmware is being used and you want to use the search mode of the firmware.
    StartAutoScan: 'off',                	// Set to 'off/on/auto' (on - starts with webserver, auto - starts scanning after 10 s when no user is connected)  Set it 'on' or 'auto' for FMDX Scanner Mode!
    AntennaSwitch: 'off',               	// Set to 'off/on' for automatic switching with more than 1 antenna at the upper band limit / Only valid for Autoscan_PE5PVB_Mode = false 
	OnlyScanHoldTime: 'off',			 	// Set to 'on/off' to force ScanHoldTime to be used for the detected frequency / use it for FM-DX monitoring

    defaultSensitivityValue: 30,        	// Value in dBf/dBµV: 1,2,3,4,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80 | in dBm: -115,-110,-105,-100,-95,-90,-85,-80,-75,-70,-65,-60,-55,-50,-45,-40 | in PE5PVB_Mode: 1,5,10,15,20,25,30
											// If Sensitivity Calibration Frequency is set then the threshold value above the noise signal can be specified here, possible values are 1-10 dBf/dBµV/dBm
	SensitivityCalibrationFrequenz: '',		// Value in MHz e.g. '87.3' / If the field is left blank (default setting), the scanner will not perform automatic noise signal calibration
    defaultScanHoldTime: 5,              	// Value in s: 1,2,3,4,5,7,10,15,20,30 / default is 7 / Only valid for Autoscan_PE5PVB_Mode = false  
    defaultScannerMode: 'normal',        	// Set the startmode: 'normal', 'spectrum', 'spectrumBL', 'difference', 'differenceBL', 'blacklist', or 'whitelist' / Only valid for PE5PVB_Mode = false 
    scanIntervalTime: 500,               	// Set the waiting time for the scanner here. (Default: 500 ms) A higher value increases the detection rate, but slows down the scanner!
    scanBandwith: 0,                     	// Set the bandwidth in Hz for the scanning process here (default = 0 [auto]). Possible values are 56000, 64000, 72000, 84000, 97000, 114000, 133000, 151000, 184000, 200000, 217000, 236000, 254000, 287000, 311000

    EnableBlacklist: false,              	// Enable Blacklist, set it 'true' or 'false' / the blacklist.txt file with frequency values (e.g. 89.000) must be located in the scanner plugin folder 
    EnableWhitelist: false,              	// Enable Whitelist, set it 'true' or 'false' / the whitelist.txt file with frequency values (e.g. 89.000) must be located in the scanner plugin folder 
	
	tuningLowerLimit: '',	             	// Set the lower band limit (e.g. '87.5') if the values differ from the web server settings (default is '',)	
	tuningUpperLimit: '',				 	// Set the upper band limit (e.g. '108.0') if the values differ from the web server settings (default is '',)

    EnableSpectrumScan: false,           	// Enable Spectrum, set it 'true' or 'false'
    EnableDifferenceScan: false,         	// Enable Spectrum, set it 'true' or 'false'
    SpectrumChangeValue: 3,              	// default is 0 (off) / Deviation value in dBf/dBµV eg. 1,2,3,4,5,... so that the frequency is scanned by deviations
    SpectrumLimiterValue: 50,            	// default is 50 / Value in dBf/dBµV ... at what signal strength should stations (locals) be filtered out
    SpectrumPlusMinusValue: 60,          	// default is 60 / Value in dBf/dBµV ... at what signal strength should the direct neighboring channels (+/- 0.1 MHz of locals) be filtered out

	HTMLlogOnlyID: true,					// Set to 'true' or 'false' for only logging identified stations, default is true (only valid for HTML File!)
    HTMLlogRAW: false,                      // Set to 'true' or 'false' for RAW data logging, default is false (only valid for HTML File!)
    HTMLOnlyFirstLog: false,                // For only first seen logging, set each station found to 'true' or 'false', default is false (only valid for HTML File!)
	CSVcreate: true,					 	// Set to 'true' or 'false' for create CSV logging file and Mapviewer button, default is true
	CSVcompletePS: true,				 	// Set to 'true' or 'false' for CSV data logging with or without PS Information, default is true
    UTCtime: true,                       	// Set to 'true' for logging with UTC Time, default is true (only valid for HTML File!)
	Log_Blacklist: false,        		 	// Enable Log Blacklist, set it 'true' or 'false' / the blacklist_log.txt file with the values (e.g. 89.000;D3C3 or 89.000 or D3C3) must be located in the scanner plugin folder 
	SignalStrengthUnit: 'dBf',			 	// Set to 'dBf', 'dBm' or 'dBµV' 

    FMLIST_OM_ID: '',                    	// To use the logbook function, please enter your OM ID here, for example: FMLIST_OM_ID: '1234' - this is only necessary if no OMID is entered under FMLIST INTEGRATION on the web server
    FMLIST_Autolog: 'off',               	// Setting the FMLIST autolog function. Set it to 'off' to deactivate the function, "on" to log everything and 'auto' if you only want to log in scanning mode (autoscan or background scan)
    FMLIST_MinDistance: 200,             	// set the minimum distance in km for an FMLIST log entry here (default: 200, minimum 200)
    FMLIST_MaxDistance: 2000,            	// set the maximum distance in km for an FMLIST log entry here (default: 2000, minimum 200)
    FMLIST_LogInterval: 60,            		// Specify here in minutes when a log entry can be sent again (default: 60, minimum 60)
    FMLIST_CanLogServer: '',             	// Activates a central server to manage log repetitions (e.g. '127.0.0.1:2000', default is '')   
	FMLIST_ShortServerName: '',		     	// set short servername (max. 10 characters) e.g. 'DXserver01', default is '' 
	FMLIST_Blacklist: false,             	// Enable FMLIST Blacklist, set it 'true' or 'false' / the blacklist_fmlist.txt file with the values (e.g. 89.000;D3C3 or 89.000 or D3C3) must be located in the scanner plugin folder 

    BEEP_CONTROL: false,                 	// Acoustic control function for scanning operation (true or false)
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

    // 1) Ensure the target directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(`Directory created: ${dirPath}`);
    }

    // 2) Migrate old config if it exists, otherwise read the current one
    const migratedConfig = migrateOldConfig(oldConfigFilePath, filePath);
    if (migratedConfig) {
        existingConfig = migratedConfig;
    } else {
        if (fs.existsSync(filePath)) {
            try {
                existingConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {
                logError(`Failed to parse ${filePath}: ${e.message}`);
                existingConfig = {};
            }
        } else {
            logInfo('Scanner configuration not found. Creating scanner.json.');
        }
    }

    // 3) Merge defaults with existing config
    const finalConfig = mergeConfig(defaultConfig, existingConfig);

    // 4) Write the updated config back
    try {
        fs.writeFileSync(filePath, JSON.stringify(finalConfig, null, 2), 'utf-8');
    } catch (e) {
        logError(`Failed to write ${filePath}: ${e.message}`);
    }

    return finalConfig;
}

// Global variables for DX-Alert config
let dxScreenshotAlert = 'off';
let dxAlertDistance = 0;
let dxAlertDistanceMax = 20000;
let dxAlertConfigExists = false;

// Function to load DX-Alert config if it exists
function loadDXAlertConfig(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const configData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            dxScreenshotAlert = configData.ScreenshotAlert || 'off';
            dxAlertDistance = configData.AlertDistance || 0;
            dxAlertDistanceMax = configData.AlertDistanceMax || 20000;
            dxAlertConfigExists = true;
            logInfo('Scanner: DX-Alert config loaded successfully.');
        } catch (e) {
            logError(`Failed to parse DX-Alert config: ${e.message}`);
            dxAlertConfigExists = false;
        }
    } else {
        dxAlertConfigExists = false;
        // logInfo('Scanner: DX-Alert config not found.');
    }
}


// Load or create the configuration file
const configPlugin = loadConfig(newConfigFilePath);
loadDXAlertConfig(dxAlertConfigFilePath); // Load DX-Alert settings

// Access variables as before
let Scanmode = configPlugin.Scanmode;
let Autoscan_PE5PVB_Mode = configPlugin.Autoscan_PE5PVB_Mode;
let Search_PE5PVB_Mode = configPlugin.Search_PE5PVB_Mode;
let StartAutoScan = configPlugin.StartAutoScan;
let AntennaSwitch = configPlugin.AntennaSwitch;
let OnlyScanHoldTime = configPlugin.OnlyScanHoldTime;

let defaultSensitivityValue = configPlugin.defaultSensitivityValue;
let SensitivityCalibrationFrequenz = configPlugin.SensitivityCalibrationFrequenz;
let defaultScanHoldTime = configPlugin.defaultScanHoldTime;
let defaultScannerMode = configPlugin.defaultScannerMode;
let scanIntervalTime = configPlugin.scanIntervalTime;
let scanBandwith = configPlugin.scanBandwith;

let EnableBlacklist = configPlugin.EnableBlacklist;
let EnableWhitelist = configPlugin.EnableWhitelist;

let tuningLowerLimit = configPlugin.tuningLowerLimit;
let tuningUpperLimit = configPlugin.tuningUpperLimit;

let EnableSpectrumScan = configPlugin.EnableSpectrumScan;
let EnableDifferenceScan = configPlugin.EnableDifferenceScan;
let SpectrumChangeValue = configPlugin.SpectrumChangeValue;
let SpectrumLimiterValue = configPlugin.SpectrumLimiterValue;
let SpectrumPlusMinusValue = configPlugin.SpectrumPlusMinusValue

let HTMLlogOnlyID = configPlugin.HTMLlogOnlyID;
let HTMLlogRAW = configPlugin.HTMLlogRAW;
let HTMLOnlyFirstLog = configPlugin.HTMLOnlyFirstLog;
let CSVcreate = configPlugin.CSVcreate
let CSVcompletePS = configPlugin.CSVcompletePS
let UTCtime = configPlugin.UTCtime;
let Log_Blacklist = configPlugin.Log_Blacklist;
let SignalStrengthUnit = configPlugin.SignalStrengthUnit;

let FMLIST_OM_ID = configPlugin.FMLIST_OM_ID;
let FMLIST_Autolog = configPlugin.FMLIST_Autolog;
let FMLIST_MinDistance = configPlugin.FMLIST_MinDistance;
let FMLIST_MaxDistance = configPlugin.FMLIST_MaxDistance;
let FMLIST_LogInterval = configPlugin.FMLIST_LogInterval;
let FMLIST_CanLogServer = configPlugin.FMLIST_CanLogServer;
let FMLIST_ShortServerName = configPlugin.FMLIST_ShortServerName;
let FMLIST_Blacklist = configPlugin.FMLIST_Blacklist;

let BEEP_CONTROL = configPlugin.BEEP_CONTROL;

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


if ((SensitivityCalibrationFrequenz !== '') && defaultSensitivityValue >= 10) {
  defaultSensitivityValue = 10;
}

const ssu = (SignalStrengthUnit || '').toLowerCase();
// defaultSensitivity conversion 
if (SensitivityCalibrationFrequenz === '') {
	let resultdefaultSensitivityValue;
	if (ssu === 'dbµv' || ssu === 'dbμv') {
		resultdefaultSensitivityValue = parseFloat(defaultSensitivityValue) + 10.875;
	} else if (ssu === 'dbm') {
		resultdefaultSensitivityValue = parseFloat(defaultSensitivityValue) + 119.75;
	} else if (ssu === 'dbf') {
		// No change for dBf!
		resultdefaultSensitivityValue = parseFloat(defaultSensitivityValue);
	} else {
		resultdefaultSensitivityValue = parseFloat(defaultSensitivityValue);
	}
	defaultSensitivityValue = Math.round(resultdefaultSensitivityValue);		
}

	let resultSpectrumLimiterValue;
	if (ssu === 'dbµv' || ssu === 'dbμv') {
		resultSpectrumLimiterValue = parseFloat(SpectrumLimiterValue) + 10.875;
	} else if (ssu === 'dbm') {
		resultSpectrumLimiterValue = parseFloat(SpectrumLimiterValue) + 119.75;
	} else if (ssu === 'dbf') {
		// No change for dBf!
		resultSpectrumLimiterValue = parseFloat(SpectrumLimiterValue);
	} else {
		resultSpectrumLimiterValue = parseFloat(SpectrumLimiterValue);
	}
	SpectrumLimiterValue = Math.round(resultSpectrumLimiterValue);
	
	let resultSpectrumPlusMinusValue;
	if (ssu === 'dbµv' || ssu === 'dbμv') {
		resultSpectrumPlusMinusValue = parseFloat(SpectrumPlusMinusValue) + 10.875;
	} else if (ssu === 'dbm') {
		resultSpectrumPlusMinusValue = parseFloat(SpectrumPlusMinusValue) + 119.75;
	} else if (ssu === 'dbf') {
		// No change for dBf!
		resultSpectrumPlusMinusValue = parseFloat(SpectrumPlusMinusValue);
	} else {
		resultSpectrumPlusMinusValue = parseFloat(SpectrumPlusMinusValue);
	}
	SpectrumPlusMinusValue = Math.round(resultSpectrumPlusMinusValue);

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

function updateSettings() {
  // Read the target file
  fs.readFile(ScannerClientFile, 'utf8', (err, targetData) => {
    if (err) {
      logError('Error reading the scanner.js file:', err);
      return;
    }

    // Check if the variables already exist
    let hasEnableBlacklist      = /const EnableBlacklist = .+;/.test(targetData);
    let hasEnableWhitelist      = /const EnableWhitelist = .+;/.test(targetData);
    let hasEnableSpectrumScan   = /const EnableSpectrumScan = .+;/.test(targetData);
    let hasEnableSpectrumScanBL = /const EnableSpectrumScanBL = .+;/.test(targetData);
    let hasEnableDifferenceScan = /const EnableDifferenceScan = .+;/.test(targetData);
    let hasEnableDifferenceScanBL = /const EnableDifferenceScanBL = .+;/.test(targetData);
    let hasSignalStrengthUnit   = /let SignalStrengthUnit = .+;/.test(targetData);

    // Replace or add the definitions
    let updatedData = targetData;

    if (hasEnableBlacklist) {
      updatedData = updatedData.replace(/const EnableBlacklist = .*;/, `const EnableBlacklist = ${EnableBlacklist};`);
    } else {
      updatedData = `const EnableBlacklist = ${EnableBlacklist};\n` + updatedData;
    }

    if (hasEnableWhitelist) {
      updatedData = updatedData.replace(/const EnableWhitelist = .*;/, `const EnableWhitelist = ${EnableWhitelist};`);
    } else {
      updatedData = `const EnableWhitelist = ${EnableWhitelist};\n` + updatedData;
    }

    if (hasEnableSpectrumScan) {
      updatedData = updatedData.replace(/const EnableSpectrumScan = .*;/, `const EnableSpectrumScan = ${EnableSpectrumScan};`);
    } else {
      updatedData = `const EnableSpectrumScan = ${EnableSpectrumScan};\n` + updatedData;
    }

    if (hasEnableSpectrumScanBL) {
      updatedData = updatedData.replace(/const EnableSpectrumScanBL = .*;/, `const EnableSpectrumScanBL = ${EnableSpectrumScanBL};`);
    } else {
      updatedData = `const EnableSpectrumScanBL = ${EnableSpectrumScanBL};\n` + updatedData;
    }

    if (hasEnableDifferenceScan) {
      updatedData = updatedData.replace(/const EnableDifferenceScan = .*;/, `const EnableDifferenceScan = ${EnableDifferenceScan};`);
    } else {
      updatedData = `const EnableDifferenceScan = ${EnableDifferenceScan};\n` + updatedData;
    }

    if (hasEnableDifferenceScanBL) {
      updatedData = updatedData.replace(/const EnableDifferenceScanBL = .*;/, `const EnableDifferenceScanBL = ${EnableDifferenceScanBL};`);
    } else {
      updatedData = `const EnableDifferenceScanBL = ${EnableDifferenceScanBL};\n` + updatedData;
    }

	if (hasSignalStrengthUnit) {
	  updatedData = updatedData.replace(/const SignalStrengthUnit = .*;/, `const SignalStrengthUnit = '${SignalStrengthUnit}';`);
	} else {
      updatedData = `const SignalStrengthUnit = '${SignalStrengthUnit}';\n` + updatedData;
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

const adminPass = config.password.adminPass; // Use admin password from main config

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
const logDir = path.resolve(__dirname, '../../web/logs'); // Absolute path to the log directory

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
let logSnapshot;
let hasSensitivityCalibrationRun = false;
let isCalibrating = false; // Block flag for normal scanning operations during calibration

// ---- START: Session-based Auth State ----
const authorizedClients = new WeakSet(); // Store authorized WebSocket clients
const activeChallenges = new Map();     // Store challenges per client
// ---- END: Session-based Auth State ----

let tuningLimit = config.webserver.tuningLimit;

if (tuningUpperLimit === '') {
    tuningUpperLimit = config.webserver.tuningUpperLimit;
    if (tuningUpperLimit === '' || !tuningLimit) {
        tuningUpperLimit = 108.0;
    }
}
// Force parsing to float to remove trailing zeros and format issues
tuningUpperLimit = parseFloat(tuningUpperLimit);
if (isNaN(tuningUpperLimit) || tuningUpperLimit > 108.0) {
    tuningUpperLimit = 108.0;
}

if (tuningLowerLimit === '') {
	tuningLowerLimit = config.webserver.tuningLowerLimit;
	if (tuningLowerLimit === '' || !tuningLimit) {
		tuningLowerLimit = 87.5;
	}
}
// Force parsing to float to remove trailing zeros and format issues
tuningLowerLimit = parseFloat(tuningLowerLimit);
if (isNaN(tuningLowerLimit)) {
    tuningLowerLimit = 87.5;
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
	                logInfo(`Scanner set auto-scan "${StartAutoScan}" defaultSensitivityValue: "${defaultSensitivityValue} dBf" Scanholdtime: "${defaultScanHoldTime}" (PE5PVB mode)`);
					if (StartAutoScan === 'on' && Autoscan_PE5PVB_Mode) {
						sendCommandToClient('J1');
						logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | defaultSensitivityValue: "${defaultSensitivityValue} dBf" | Scanholdtime: "${ScanHoldTime}" (PE5PVB mode)`);
					}
                } else {
                    logInfo(`Scanner set auto-scan "${StartAutoScan}" defaultSensitivityValue: "${defaultSensitivityValue} dBf" mode "${defaultScannerMode}" Scanholdtime: "${defaultScanHoldTime}"`);
					if (StartAutoScan === 'on') {
						if (SensitivityCalibrationFrequenz !== '') {
							if (ScannerMode === 'spectrum' || ScannerMode === 'difference') {
								logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "Auto" | Limit: "${SpectrumLimiterValue}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
							} else {
								logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "Auto" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
							}
						} else {				
							if (ScannerMode === 'spectrum' || ScannerMode === 'difference') {
								logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity} dBf" | Limit: "${SpectrumLimiterValue}" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
							} else {
								logInfo(`Scanner Tuning Range: ${tuningLowerLimit} MHz - ${tuningUpperLimit} MHz | Sensitivity: "${Sensitivity} dBf" | Mode: "${ScannerMode}" | Scanholdtime: "${ScanHoldTime}"`);
							}
						}
						if (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL') {
							currentFrequency = tuningLowerLimit;
							sendDataToClient(currentFrequency);
							setTimeout(() => {
								startSpectrumAnalyse(); 
								Scan = 'on';
								AutoScan();
							}, 2000); 
						} else {
							setTimeout(() => {
								Scan = 'on';
								AutoScan();
							}, 2000);
						}	
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

/**
 * Builds and sends a Scanner response message back to the requesting client.
 * @param {string} targetIP - The IP (or identifier) from message.source
 */
function SendResponseMessage(targetIP) {
  const responseMessage = createMessage(
    'response',
    targetIP,
    Scan,
    '',
    Sensitivity,
    ScannerMode,
    ScanHoldTime,
    FMLIST_Autolog
  );
  DataPluginsSocket.send(JSON.stringify(responseMessage));
  // logInfo(`Sent response message: ${JSON.stringify(responseMessage)}`);
}

async function DataPluginsWebSocket() {
  // If there's no existing socket or it is closed, (re)open it
  if (!DataPluginsSocket || DataPluginsSocket.readyState === WebSocket.CLOSED) {
    try {
      DataPluginsSocket = new WebSocket(externalWsUrl + '/data_plugins');

      // Add a reference to the WebSocket object for auth state tracking
      DataPluginsSocket.on('message', (data) => {
        if (!useHooks) handleDataPluginsMessage(data, DataPluginsSocket);
      });
      
      DataPluginsSocket.on('close', () => {
        logInfo("Scanner WebSocket closed.");
        authorizedClients.delete(DataPluginsSocket); // Clean up auth state
        activeChallenges.delete(DataPluginsSocket); // Clean up challenges
        setTimeout(DataPluginsWebSocket, 1000); // Reconnect
      });

      DataPluginsSocket.onopen = () => {
        logInfo(`Scanner connected to ${externalWsUrl}/data_plugins`);
      };

      DataPluginsSocket.onerror = (error) => {
        logError("WebSocket error:", error);
      };

    } catch (error) {
      logError("Failed to set up WebSocket:", error);
      setTimeout(DataPluginsWebSocket, 1000);
    }
  }
}

function handlePluginConnection(ws, req) {
    ws.on('message', (data) => {
        handleDataPluginsMessage(data, req);
    });
}

async function handleDataPluginsMessage(eventData, ws) {
    try {
        const message = JSON.parse(eventData);

        if (!message || (message.type !== 'Scanner' && message.type !== 'sigArray' && message.type !== 'GPS')) {
            return;
        }

        let isAdminLocked = false;

        if (useHooks) {
            const session = ws.session || {};
            const isAdmin = session.isAdminAuthenticated || session.isTuneAuthenticated;
            const isLocked = !serverConfig.publicTuner || serverConfig.lockToAdmin;

            if (isLocked && !isAdmin) {
                isAdminLocked = true;
                logInfo('Scanner blocked non-admin scan during lock');
            }
        }
        
        const clientSource = message.source || 'unknown';

        // ---------------------------------------------------
        // TEF Logger vs. Legacy Scanner:
        //  - TEF Logger: source contains "tef"  -> Requires Auth
        //  - Legacy Scanner: everything else    -> Full access
        // ---------------------------------------------------
        const isTefLoggerClient =
            typeof clientSource === 'string' &&
            clientSource.toLowerCase().includes('tef');

        // --- SESSION AUTHENTICATION & SEARCH COMMANDS (UNRESTRICTED) ---
        if (message.type === 'Scanner') {

            // Handle unrestricted Search commands immediately (for all clients)
            if (message.value.status === 'command' && message.value.Search) {
                if (message.value.Search === 'down') {
                    if (!isAdminLocked) if (SearchPE5PVB) { sendCommandToClient('C1'); } else { startSearch('down'); }
                }
                if (message.value.Search === 'up') {
                    if (!isAdminLocked) if (SearchPE5PVB) { sendCommandToClient('C2'); } else { startSearch('up'); }
                }
                return; // Search commands are handled, exit
            }

            // ---------------------------------------------------
            // AUTH: Only TEF Logger needs to authenticate
            // Legacy-Scanner: ignores auth_request, has full access anyway
            // ---------------------------------------------------
            if (isTefLoggerClient && message.value.status === 'auth_request') {
                if (adminPass) {
                    // Password is configured on server, check the one from client
                    if (message.value.password === adminPass) {
                        logInfo(`Scanner client authentication successful for ${clientSource}.`);
                        authorizedClients.add(ws); // Authorize this client session
                        
                        const authSuccessMsg = {
                            type: 'Scanner',
                            value: { status: 'auth_success' },
                            source: source,
                            target: clientSource
                        };
                        ws.send(JSON.stringify(authSuccessMsg));
                        SendResponseMessage(clientSource); // Also send current scanner state
                    } else {
                        logWarn(`Scanner client authentication failed for ${clientSource}. Invalid password.`);
                        const authFailedMsg = {
                            type: 'Scanner',
                            value: { status: 'auth_failed' },
                            source: source,
                            target: clientSource
                        };
                        ws.send(JSON.stringify(authFailedMsg));
                    }
                } else {
                    // No admin password configured on server, grant access immediately.
                    logInfo(`Scanner client authorized for ${clientSource} (no admin password configured).`);
                    authorizedClients.add(ws);
                    const authSuccessMsg = {
                        type: 'Scanner',
                        value: { status: 'auth_success' },
                        source: source,
                        target: clientSource
                    };
                    ws.send(JSON.stringify(authSuccessMsg));
                    SendResponseMessage(clientSource);
                }
                return;
            }

            // Handle status requests
            if (message.value.status === 'request') {
                if (!isTefLoggerClient) {
                    // Legacy Scanner: always full access, independent of adminPass
                    SendResponseMessage(clientSource);
                } else {
                    // TEF Logger: only after successful Auth, if adminPass is set
                    if (!adminPass || authorizedClients.has(ws)) {
                        SendResponseMessage(clientSource);
                    } else {
                        logWarn(`TEF Logger client ${clientSource} sent status=request without auth; ignoring.`);
                    }
                }
                return;
            }
        }
        
        // ---------------------------------------------------
        // RESTRICTED COMMANDS:
        //  - TEF Logger + adminPass -> Requires Auth
        //  - Legacy Scanner         -> NEVER requires Auth (Full access)
        // ---------------------------------------------------
        const requiresAuth = isTefLoggerClient && !!adminPass;

        if (requiresAuth && !authorizedClients.has(ws)) {
            if (message.value && message.value.status === 'command') {
                logWarn(`Ignoring restricted command from unauthorized TEF Logger client ${clientSource}.`);
            }
            return;
        }
        // --- END OF AUTHENTICATION / UNRESTRICTED LOGIC ---

        // Handle other messages from clients (Legacy always allowed, TEF Logger only after Auth)

        if (message.type === 'sigArray' && message.isScanning) {
            sigArray = message.value; 

            const primaryFrequencies = sigArray.filter(entry => {
                const hasSecondDecimalZero = Math.round(entry.freq * 100) % 10 === 0;
                return entry.sig > SpectrumLimiterValue && hasSecondDecimalZero;
            });

            let extendedFrequencies = [];

            primaryFrequencies.forEach(primary => {
                const freqNum = parseFloat(primary.freq);
                if (isNaN(freqNum)) return;

                const lowerBound = parseFloat((freqNum - 0.1).toFixed(2));
                const upperBound = parseFloat((freqNum + 0.1).toFixed(2));

                if (primary.sig >= SpectrumPlusMinusValue) {
                    const inRange = sigArray.filter(entry => {
                        const entryFreq = parseFloat(entry.freq);
                        return entryFreq >= lowerBound && entryFreq <= upperBound;
                    });
                    extendedFrequencies.push(...inRange);
                }
            });

            extendedFrequencies = Array.from(
                new Map(extendedFrequencies.map(item => [item.freq, item])).values()
            );

            sigArraySpectrum = sigArray.filter(entry => {
                const isInExtended = extendedFrequencies.some(ext => ext.freq === entry.freq);
                const isPrimary = primaryFrequencies.some(pr => pr.freq === entry.freq);
                return !isInExtended && !isPrimary;
            });

            sigArrayDifference = sigArraySpectrum;

            if (currentAntennaIndex === 0) { freqMap2 = new Map(sigArraySave0.map(item => [parseFloat(item.freq), parseFloat(item.sig)])); }
            if (currentAntennaIndex === 1) { freqMap2 = new Map(sigArraySave1.map(item => [parseFloat(item.freq), parseFloat(item.sig)])); }
            if (currentAntennaIndex === 2) { freqMap2 = new Map(sigArraySave2.map(item => [parseFloat(item.freq), parseFloat(item.sig)])); }
            if (currentAntennaIndex === 3) { freqMap2 = new Map(sigArraySave3.map(item => [parseFloat(item.freq), parseFloat(item.sig)])); }

            sigArrayDifference = sigArrayDifference.filter(item => {
                const freqNum = parseFloat(item.freq);
                const sigNum = parseFloat(item.sig);
                if (sigNum < Sensitivity) return false;
                if (!freqMap2.has(freqNum)) return true;
                const prevSig = freqMap2.get(freqNum);
                return Math.abs(sigNum - prevSig) > SpectrumChangeValue;
            });

            if (currentAntennaIndex === 0) sigArraySave0 = Array.from(sigArray);
            if (currentAntennaIndex === 1) sigArraySave1 = Array.from(sigArray);
            if (currentAntennaIndex === 2) sigArraySave2 = Array.from(sigArray);
            if (currentAntennaIndex === 3) sigArraySave3 = Array.from(sigArray);
        }

        if (message.type === 'Scanner' && message.value.status === 'command') {
            // These commands require authorization ONLY for TEF Logger (legacy always free)

            if (message.value.Sensitivity !== undefined && message.value.Sensitivity !== '') {
                Sensitivity = message.value.Sensitivity;
                if (ScanPE5PVB) {
                    sendCommandToClient(`I${Sensitivity}`);
                    logInfo(`Scanner (PE5PVB mode) set sensitivity "${Sensitivity} dBf" [IP: ${clientSource}]`);
                } else {
                    logInfo(`Scanner set sensitivity "${Sensitivity} dBf" [IP: ${clientSource}]`);
                    SendResponseMessage(clientSource);
                }
            }

            if (message.value.ScannerMode === 'normal') {
                ScannerMode = 'normal';
                hasSensitivityCalibrationRun = false;   // After Mode-Switch: next AutoScan starts from the beginning again
                logInfo(`Scanner set mode "normal" [IP: ${clientSource}]`);
                SendResponseMessage(clientSource);
            }

            if (message.value.ScannerMode === 'blacklist' && EnableBlacklist) {
                if (blacklist.length > 0) {
                    ScannerMode = 'blacklist';
                    hasSensitivityCalibrationRun = false;   // New Session for this mode
                    logInfo(`Scanner set mode "blacklist" [IP: ${clientSource}]`);
                } else {
                    logInfo(`Scanner mode "blacklist" not available! [IP: ${clientSource}]`);
                    ScannerMode = 'normal';
                    hasSensitivityCalibrationRun = false;
                }
                SendResponseMessage(clientSource);
            }

            if (message.value.ScannerMode === 'whitelist' && EnableWhitelist) {
                if (whitelist.length > 0) {
                    ScannerMode = 'whitelist';
                    hasSensitivityCalibrationRun = false;   // New Session for this mode
                    logInfo(`Scanner set mode "whitelist" [IP: ${clientSource}]`);
                } else {
                    logInfo(`Scanner mode "whitelist" not available! [IP: ${clientSource}]`);
                    ScannerMode = 'normal';
                    hasSensitivityCalibrationRun = false;
                }
                SendResponseMessage(clientSource);
            }

            if (
                (message.value.ScannerMode === 'spectrum'   && EnableSpectrumScan) ||
                (message.value.ScannerMode === 'spectrumBL' && EnableSpectrumScan && EnableBlacklist) ||
                (message.value.ScannerMode === 'difference' && EnableDifferenceScan) ||
                (message.value.ScannerMode === 'differenceBL' && EnableDifferenceScan && EnableBlacklist)
            ) {
                ScannerMode = message.value.ScannerMode;
                logInfo(`Scanner set mode "${ScannerMode}" [IP: ${clientSource}]`);
                SendResponseMessage(clientSource);

                if (sigArray.length === 0) {
                    currentFrequency = tuningLowerLimit;
                    sendDataToClient(currentFrequency);
                    setTimeout(() => { startSpectrumAnalyse(); }, 1000);
                }
            }

            if (message.value.ScanHoldTime !== undefined && message.value.ScanHoldTime !== '') {
                ScanHoldTime = message.value.ScanHoldTime;
                if (ScanPE5PVB) {
                    sendCommandToClient(`K${ScanHoldTime}`);
                    logInfo(`Scanner (PE5PVB mode) set scanholdtime "${ScanHoldTime}" [IP: ${clientSource}]`);
                } else {
                    logInfo(`Scanner set scanholdtime "${ScanHoldTime}" [IP: ${clientSource}]`);
                }
                SendResponseMessage(clientSource);
            }
            
            if (message.value.Scan === 'on' && Scan === 'off') {
                Scan = 'on';
                logInfo(`Scanner starts auto-scan [IP: ${clientSource}]`);
                SendResponseMessage(clientSource);
                AutoScan();
            }
            if (message.value.Scan === 'off' && Scan === 'on') {
                Scan = 'off';
                logInfo(`Scanner stops auto-scan [IP: ${clientSource}]`);
                SendResponseMessage(clientSource);
                stopAutoScan();
            }

            // Handle Tune commands forwarded from TEF logger app
            if (message.value.Tune !== undefined && message.value.Tune !== '') {
                logInfo(`Scanner received tuning command "${message.value.Tune}" [IP: ${clientSource}]`);
                sendCommandToClient(message.value.Tune);
            }
        }

        if (message.type === 'GPS') {
            // GPS Updates: allowed for Legacy and TEF Logger,
            // but TEF Logger only after Auth (because of requiresAuth above)
            const { lat, lon, alt, mode, time } = message.value;
            if (lat !== '') LAT = lat;
            if (lon !== '') LON = lon;
            if (alt !== '') ALT = alt;
            gpsmode = mode;
            gpstime = time;
        }
    } catch (error) {
        logError("Failed to handle message:", error);
    }
}


function InitialMessage() {
    const ws = new WebSocket(externalWsUrl + '/data_plugins');
    ws.on('open', () => {
        // logInfo(`Scanner connected to ${ws.url}`);	
        ws.send(JSON.stringify(createMessage('broadcast', '255.255.255.255', 'off', 'off', defaultSensitivityValue, defaultScannerMode, defaultScanHoldTime, FMLIST_Autolog))); // Send initial status
    });
}

async function sendDataToClient(frequency) {
    const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
    try {
        if (sendPrivilegedCommand) {
            await sendPrivilegedCommand(dataToSend, true);
            return;
        }

        if (textSocket && textSocket.readyState === WebSocket.OPEN) {
            textSocket.send(dataToSend);
        } else {
            logError('WebSocket not open.');
            setTimeout(() => sendDataToClient(frequency), 100); // Retry after a short delay
        }
    } catch (error) {
        logError("Failed to send data to client:", error);
    }
}

async function sendCommandToClient(command) {
    try {
        if (sendPrivilegedCommand) {
            const success = await sendPrivilegedCommand(command, true);
            if (success) return;
        }

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
			if (AntennaSwitch && saveAutoscanAntenna) sendCommandToClient(`Z${saveAutoscanAntenna}`);
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

    // Prevent scanner from wandering off during calibration
    if (!isCalibrating) {
        if (!ScanPE5PVB) {
            checkStereo(stereo_detect, freq, strength, picode, station, checkStrengthCounter);
        } else {
            PE5PVBlog(freq, picode, station, checkStrengthCounter)
        }
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
    // logInfo(`Scanner switched to antenna ${ant.number - 1}: ${ant.name}`);
    sendCommandToClient(`Z${ant.number - 1}`); // Z0 to Z3 for ant1 to ant4

    // Move to the next index
    currentAntennaIndex = (currentAntennaIndex + 1) % enabledAntennas.length;
}

async function SensitivityValueCalibration() {
    isCalibrating = true; 
    try {
        clearInterval(scanInterval); // Pause scanning
        let calibFreq = Math.round(parseFloat(SensitivityCalibrationFrequenz) * 100) / 100;
        
        // 1. If in a spectrum mode, wait until the spectrum scan finishes (sigArray is populated)
        if (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL') {
            let waitSpectrum = 0;
            // Wait up to 10 seconds for the spectrum array to fill
            while (sigArray.length === 0 && waitSpectrum < 50) { 
                await new Promise(resolve => setTimeout(resolve, 200));
                waitSpectrum++;
            }
            // Extra delay to ensure the tuner is ready to receive new commands after the heavy scan
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        sendDataToClient(calibFreq);
        
        // 2. Wait until the tuner has actually tuned to the calibration frequency
        let retries = 0;
        while (retries < 50) { 
            const currentReportedFreq = parseFloat(freq);
            // Check if the reported frequency matches our target calibration frequency
            if (!isNaN(currentReportedFreq) && Math.abs(currentReportedFreq - calibFreq) < 0.05) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        // 3. Wait an additional 2 seconds for the signal strength reading to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        Sensitivity = Math.round(strength) + Math.round(defaultSensitivityValue);
        // logInfo(`Scanner set Sensitivity Value on ${calibFreq} MHz to ${Sensitivity} [${Math.round(strength)} + ${defaultSensitivityValue}]`);			

        // Create and send a broadcast message to update the UI
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
    } finally {
        isCalibrating = false; // Re-enable normal scanning checks
    }
}


async function AutoScan() {
    if (!isScanning) {
        // Bandwidth handling when starting auto-scan
        if (scanBandwith === '0' || scanBandwith === 0) {
            if (bandwith !== '0' && bandwith !== 0) {
                logInfo('Scanner set bandwith from:', bandwith, 'Hz to: auto mode');
            }
        } else {
            if (bandwith === '0' || bandwith === 0) {
                logInfo('Scanner set bandwith from: auto mode to:', scanBandwith, 'Hz');
            } else {
                logInfo('Scanner set bandwith from:', bandwith, 'Hz to:', scanBandwith, 'Hz');
            }
        }

        scanBandwithSave = bandwith;
        sendCommandToClient(`W${scanBandwith}\n`);

        // Only these modes get the "continue at next frequency" behaviour
        const isStandardMode =
            ScannerMode === 'normal' ||
            (ScannerMode === 'blacklist' && EnableBlacklist) ||
            (ScannerMode === 'whitelist' && EnableWhitelist);

        if (isStandardMode) {
            // In normal/blacklist/whitelist we differentiate:
            //  - first start after mode switch -> Calibration frequency or lower band limit
            //  - restart after Auto-Stop -> continue at the next frequency

            if (!hasSensitivityCalibrationRun) {
                // First start in this mode
                currentFrequency = tuningLowerLimit; // Ensure frequency starts from bottom
                if (SensitivityCalibrationFrequenz) {
                    // Start via Calibration frequency
                    await SensitivityValueCalibration();
                }
                hasSensitivityCalibrationRun = true;
            } else {
                // Restart after Auto-Stop -> do not go back to calibration / band limit,
                // but continue with the next frequency
                let lastFreq = parseFloat(freq);

                if (isNaN(lastFreq) || lastFreq === 0.0) {
                    // If nothing meaningful is there -> lower band limit
                    currentFrequency = tuningLowerLimit;
                } else {
                    // Same grid as in startScan():
                    //  - < 74 MHz  -> 0.01 MHz
                    //  - >= 74 MHz -> 0.1 MHz, except Whitelist (0.01 MHz)
                    let step;
                    if (lastFreq < 74.0) {
                        step = 0.01;
                    } else {
                        if (ScannerMode === 'whitelist' && EnableWhitelist) {
                            step = 0.01;
                        } else {
                            step = 0.1;
                        }
                    }

                    currentFrequency = lastFreq + step;
                    currentFrequency = Math.round(currentFrequency * 100) / 100; // 2 decimal places
                }
            }
        } else {
            // All other modes (spectrum, spectrumBL, difference, differenceBL ...)
            // keep the previous behavior:
            //  - If Calibration frequency is set -> always start via it
            //  - Otherwise from the lower band limit
            currentFrequency = tuningLowerLimit; // Ensure frequency starts from bottom
            if (SensitivityCalibrationFrequenz) {
                await SensitivityValueCalibration();
            }
        }

        startScan('up'); // Start scanning once
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
	sendCommandToClient(`W${scanBandwithSave}\n`);
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

            // --- pluginsApi (internal only) ---
            const internalMessage = JSON.parse(message);

            if (pluginsApi?.emitPluginEvent) {
                emitPluginEvent('spectrum-graph', internalMessage, { broadcast: false });
            }

            // --- DataPluginsSocket (fallback) ---
            if (DataPluginsSocket && DataPluginsSocket.readyState === WebSocket.OPEN) {
                DataPluginsSocket.send(message);
            }

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

async function startScan(direction) {
    clearInterval(scanInterval); // Stops any active scan interval from the previous scan
    
    // If the current frequency is invalid (NaN) or zero, set it to the lower tuning limit
    if (isNaN(currentFrequency) || currentFrequency === 0.0) {
        currentFrequency = tuningLowerLimit;
    }
	
    // Function to update the frequency during the scan
    async function updateFrequency() {
		
        if (!isScanning) {
            //logInfo('Scanning has been stopped.'); // Log that scanning was stopped
            return; // Exit the function if scanning is stopped
        }

        currentFrequency = Math.round(currentFrequency * 100) / 100; // Round to two decimal places
        
        // If scanning downwards
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
					if (SensitivityCalibrationFrequenz) {
						await SensitivityValueCalibration();
						if (EnableSpectrumScan || EnableSpectrumScanBL || EnableDifferenceScan || EnableDifferenceScanBL) {
							setTimeout(() => {
								startSpectrumAnalyse(); // Trigger spectrum analysis after 1 second
							}, 1000);
						}
                        
                        // Restart the scan properly from the bottom after calibration completes
                        currentFrequency = tuningLowerLimit;
                        startScan('up');
                        return; // Exit this execution cycle to allow clean restart
					} else { 
				      if ( ScannerMode === 'normal' || ScannerMode === 'blacklist' || ScannerMode === 'whitelist' ) {
						  currentFrequency = tuningLowerLimit;
					  }
					}
				} else {
				    if (Scan !== 'on') {
				       currentFrequency = tuningLowerLimit;
					}
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
						if (SensitivityCalibrationFrequenz) {
							await SensitivityValueCalibration();
							if (EnableSpectrumScan || EnableSpectrumScanBL || EnableDifferenceScan || EnableDifferenceScanBL) {
								startSpectrumAnalyse(); // Trigger spectrum analysis
							}
						}				
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
								let intervalId = setInterval(performSpectrumAnalysis, 3500);
								
								if (SensitivityCalibrationFrequenz) {
									await SensitivityValueCalibration();					
								}
								
								sendDataToClient(currentFrequency); // Send the updated frequency to the client
                                // Restart the scan properly from the bottom after calibration completes
                                startScan('up');
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
				
				// Overwrite the actual signal strength in the corresponding array for all four modes
				if (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL' ) {
					
					// Choose the correct array based on the mode
					const arr = (ScannerMode === 'difference' || ScannerMode === 'differenceBL')
						? sigArrayDifference
						: sigArraySpectrum;

					// Round frequency to two decimal places for consistent comparison
					const freqRounded = Math.round(parseFloat(freq) * 100) / 100;

					// Find the matching entry index
					const idx = arr.findIndex(item =>
						Math.round(parseFloat(item.freq) * 100) / 100 === freqRounded
					);

					if (idx !== -1) {
						// Update existing entry
						arr[idx].sig = strength.toString();
					} else {
						// Add a new entry if not found
						arr.push({
							freq: freqRounded.toFixed(2),
							sig:  strength.toString()
						});
					}
				}			

                if (strength > Sensitivity || picode.length > 1 || strength > Sensitivity && !isSearching &&  (ScannerMode === 'spectrum' && Scan === 'on' || ScannerMode === 'spectrumBL' && Scan === 'on' || ScannerMode === 'difference' || ScannerMode === 'differenceBL' && Scan === 'on' )) {					
					//console.log(strength, Sensitivity);
					

                    if (picode.length > 1 && ScannerMode !== 'spectrum' && ScannerMode !== 'spectrumBL' && ScannerMode !== 'difference' && ScannerMode !== 'differenceBL') {
                        ScanHoldTimeValue += 50;
                    }				
					
					// Convert both values to numbers rounded to 2 decimal places to safely compare them
					let currentFreqNum = Math.round(parseFloat(currentFrequency) * 100) / 100;
					let lowerLimitNum = Math.round(parseFloat(tuningLowerLimit) * 100) / 100;

					if (currentFreqNum !== lowerLimitNum) {
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
												logSnapshot = {
													stationid,
													station,
													itu,
													city,
													distance,
													freq,
													picode,
													ps,
													strength,
													tp,
													ta,
													af
												};
												writeLogFMLIST(logSnapshot);	
											}
												
										}
										
											//isScanning = false;
											checkStrengthCounter = 0; // Reset the counter
											stereo_detect = false;
											station = '';
											Savefreq = freq;

                                            // Determine wait time for screenshot
                                            let screenshotWaitTime = 0;
                                            if (dxAlertConfigExists && dxScreenshotAlert === 'on' && distance >= dxAlertDistance && distance < dxAlertDistanceMax) {
                                                if (OnlyScanHoldTime === 'off') {
                                                    screenshotWaitTime = 3000;
                                                } else if (OnlyScanHoldTime === 'on' && ScanHoldTime < 3) {
                                                    screenshotWaitTime = 3000;
                                                }
                                            }

                                            if (screenshotWaitTime > 0) {
                                                setTimeout(() => {
                                                    startScan('up'); // Restart scanning after the delay
                                                }, screenshotWaitTime);
                                            } else {
                                                startScan('up'); // Restart scanning immediately
                                            }					
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
										logSnapshot = {
											stationid,
											station,
											itu,
											city,
											distance,
											freq,
											picode,
											ps,
											strength,
											tp,
											ta,
											af
										};
										writeLogFMLIST(logSnapshot);	
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
												logSnapshot = {
													stationid,
													station,
													itu,
													city,
													distance,
													freq,
													picode,
													ps,
													strength,
													tp,
													ta,
													af
												};
												writeLogFMLIST(logSnapshot);	
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
										logSnapshot = {
											stationid,
											station,
											itu,
											city,
											distance,
											freq,
											picode,
											ps,
											strength,
											tp,
											ta,
											af
										};
										writeLogFMLIST(logSnapshot);	
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

async function writeCSVLogEntry() {
	
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
            logError && logError('Scanner could not load blacklist_log.txt:', err);
        }

        const freqKey  = parseFloat(freq).toFixed(3);
        const piKey    = typeof picode !== 'undefined' ? picode.toString() : '';
        const comboKey = `${freqKey};${piKey}`;

        if (Logblacklist.includes(comboKey) || Logblacklist.includes(freqKey) || Logblacklist.includes(piKey)) {
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
        logFilePathCSV = getLogFilePathCSV();
    }
    
    // Data preparation for FMLIST
    const [seconds, nanoseconds] = process.hrtime();
    const nanoString = nanoseconds.toString().padStart(9, '0');
    const dateTimeStringNanoSeconds = `${date}T${time.slice(0, -1)}${nanoString} Z`;
    
    const dateTimeString = `${date}T${time}`;
    const dateObject = new Date(dateTimeString);
    const UNIXTIME = Math.floor(dateObject.getTime() / 1000);

    const FREQTEXT = `freq`;
    const numericFrequency = parseFloat(freq);
    const frequencyInHz = Math.round(numericFrequency * 1_000_000);
    const rdson = rds ? 1 : 0;   
    
    SignalStrengthUnitLowerCase = 'dbµv';
    
    const numericStrengthTop = parseFloat(strengthTop) - 10.875;
    const numericStrength = parseFloat(strength) - 10.875;
    
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

    // --- TX information (append newly) ---
    const safe = v => (typeof v === 'undefined' || v === null) ? '' : String(v).trim().replace(/"/g, '');
    const TX_STATION = `"${safe(station)}"`;
    const TX_CITY    = `"${safe(city)}"`;
    const TX_ITU     = `"${safe(itu)}"`;
    const TX_ERP     = `${safe(erp)}`;
    const TX_POL     = `${safe(pol)}`;
    const TX_DIST    = `${safe(distance)}`;
    const TX_AZ      = `${safe(azimuth)}`;

    // By default keep TX lat/lon empty (per your request)
    let TX_LAT = '';
    let TX_LON = '';

    // Only fetch coordinates if numeric stationid present and not "0"
    if (typeof stationid !== 'undefined' && stationid !== null) {
        const stationIdStr = String(stationid).trim();
        if (stationIdStr !== '' && stationIdStr !== '0') {
            // Helper: fetch API using native https and return parsed JSON (with timeout)
            const https = require('https');
            function fetchJsonUrl(url, timeoutMs = 5000) {
                return new Promise((resolve, reject) => {
                    try {
                        const req = https.get(url, (res) => {
                            let data = '';
                            res.on('data', (chunk) => data += chunk);
                            res.on('end', () => {
                                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                                    try {
                                        const json = JSON.parse(data);
                                        resolve(json);
                                    } catch (e) {
                                        reject(new Error('Invalid JSON from maps.fmdx.org: ' + e.message));
                                    }
                                } else {
                                    reject(new Error(`maps.fmdx.org returned status ${res.statusCode}`));
                                }
                            });
                        });
                        req.on('error', (err) => reject(err));
                        req.setTimeout(timeoutMs, () => {
                            req.destroy(new Error('timeout'));
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            }

            const directUrl = `https://maps.fmdx.org/api/?id=${encodeURIComponent(stationIdStr)}`;
            try {
                const json = await fetchJsonUrl(directUrl, 5000);
                if (json && json.locations) {
                    const locKeys = Object.keys(json.locations);
                    if (locKeys.length > 0) {
                        const firstLoc = json.locations[locKeys[0]];
                        if (firstLoc && typeof firstLoc.lat !== 'undefined' && typeof firstLoc.lon !== 'undefined') {
                            // set TX coordinates only if valid numbers present
                            const latVal = firstLoc.lat;
                            const lonVal = firstLoc.lon;
                            if (latVal !== null && latVal !== '' && lonVal !== null && lonVal !== '') {
                                TX_LAT = String(latVal);
                                TX_LON = String(lonVal);
                            }
                        }
                    }
                }
            } catch (err) {
                // on error keep TX_LAT/TX_LON empty
                // optionally log via logError if desired:
                logError && logError('Could not fetch TX coordinates from maps.fmdx.org:', err.message || err);
            }
        }
    }

    const TX_LAT_CSV = `${(TX_LAT || '').replace(/"/g, '')}`;
    const TX_LON_CSV = `${(TX_LON || '').replace(/"/g, '')}`;
    // --- Ende TX information ---

    // Create the log line as a string
    // Put '30,' before the first column
    let newLine = `30,${UNIXTIME},${FREQTEXT},${frequencyInHz},${rdson},${SNRMIN},${SNRMAX},${dateTimeStringNanoSeconds},${GPSLAT},${GPSLON},${GPSMODE},${GPSALT},${GPSTIME},${PI},1,${PS},1,${TA},${TP},${MUSIC},${ProgramType},${GRP},${STEREO},${DYNPTY},${OTHERPI},,${ALLPSTEXT},${OTHERPS},,${ECC},${STATIONID},${AF},${RT},,,,`;

    // Append the TX fields at the end (in the same CSV order as prefilledData)
    newLine += `${TX_STATION},${TX_CITY},${TX_ITU},${TX_ERP},${TX_POL},${TX_DIST},${TX_AZ},${TX_LAT_CSV},${TX_LON_CSV}\n`;

    try {
        if (CSVcreate) {
            if (!CSVcompletePS) {
                if (lastFrequencyInHz !== null && lastFrequencyInHz === frequencyInHz) {
                    const fileContent = fs.readFileSync(logFilePathCSV, 'utf8');
                    const lines = fileContent.split('\n');
                    if (lines[lines.length - 1] === '') {
                        lines.pop();
                    }
                    lines[lines.length - 1] = newLine.trim();                        
                    fs.writeFileSync(logFilePathCSV, lines.join('\n') + '\n');
                } else {
                    fs.appendFileSync(logFilePathCSV, newLine, { flag: 'a' });
                    lastFrequencyInHz = frequencyInHz;
                }
            } else {
                fs.appendFileSync(logFilePathCSV, newLine, { flag: 'a' });
            }
        }
        
        if (BEEP_CONTROL && Scan === 'on') {
            fs.createReadStream('./plugins/Scanner/sounds/beep_short.wav')
              .pipe(new Speaker());
        }
    } catch (error) {
        logError && logError("Failed to write log entry:", error.message || error);
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
            ? `<table border="1"><tr><th>DATE</th><th>TIME(UTC)</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>ANT</th><th>P</th><th>ERP(kW)</th><th>STRENGTH(${SignalStrengthUnit})</th><th>DIST(km)</th><th>AZ(°)</th><th>ID</th><th>MODE</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n` 
            : `<table border="1"><tr><th>DATE</th><th>TIME</th><th>FREQ</th><th>PI</th><th>PS</th><th>NAME</th><th>CITY</th><th>ITU</th><th>ANT</th><th>P</th><th>ERP(kW)</th><th>STRENGTH(${SignalStrengthUnit})</th><th>DIST(km)</th><th>AZ(°)</th><th>ID</th><th>MODE</th><th>STREAM</th><th>MAP</th><th>FMLIST</th></tr>\n`;

        try {
            fs.writeFileSync(filePath, header, { flag: 'w' });
            logInfo('Scanner created /logs/' + fileName);
        } catch (error) {
            logError('Failed to create /logs/' + fileName, ':', error.message);
        }
    }

    return filePath;
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
		numericStrength = parseFloat(strength) - 119.75;
	} else {
		numericStrength = parseFloat(strength);
	}
	
	const SNR = numericStrength.toFixed(1);
	
    logFilePathHTML = getLogFilePathHTML(date, time, isFiltered);

	let link1 = stationid !== '' && stationid !== 'offline' ? `<a href="#" onclick="window.open('https://fmscan.org/stream.php?i=${stationid}', 'newWindow', 'width=800,height=160'); return false;" target="_blank">STREAM</a>` : '';     
	let link2 = stationid !== '' && stationid !== 'offline' ? `<a href="https://maps.fmdx.org/#qth=${LAT},${LON}&id=${stationid}&findId=*" target="_blank">MAP</a>` : '';     
	let link3 = stationid !== '' && stationid !== 'offline' && stationid > 0 && FMLIST_OM_ID !== '' ? `<a href="https://www.fmlist.org/fi_inslog.php?lfd=${stationid}&qrb=${distance}&qtf=${azimuth}&country=${itu}&omid=${FMLIST_OM_ID}" target="_blank">FMLIST</a>` : '';

    let psWithUnderscores = ps.replace(/ /g, '_');
	let scanmode;
	
	if (Scan === 'on') {
		scanmode = 'A';
	} else {
		scanmode = 'M';
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
    if (FMLIST_LogInterval < 60 || FMLIST_LogInterval === '' || FMLIST_LogInterval === undefined) {
        FMLIST_LogInterval = 60;
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
async function writeLogFMLIST({
  stationid,
  station,
  itu,
  city,
  distance,
  freq,
  picode,
  ps,
  strength,
  tp,
  ta,
  af
}) {
	
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
	
    // Check UUID and abort if null
	if (config.identification.token == null) {
		logError("UUID is null. Cannot log FMLIST data.");
		return; // Stop here so we never send without a valid UUID
	}

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